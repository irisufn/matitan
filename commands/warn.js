const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// 実行を許可するユーザーID・ロールID
const ALLOWED_USER_ID = ['986615974243491880', '1340695645354328180'];
const ALLOWED_ROLE_ID = '1394113342876155914';

// JSON管理チャンネルIDとメッセージID
const DATA_CHANNEL_ID = '1422204415036752013';
const DATA_MESSAGE_ID = '1436925986594750496';

// タイムアウト期間
const TIMEOUTS = {
  警告: null,
  厳重注意: 10 * 60 * 1000, // 10分
  停止: 24 * 60 * 60 * 1000 // 1日
};

// データ読み込み
async function loadData(client) {
  const channel = await client.channels.fetch(DATA_CHANNEL_ID);
  let msg;
  try {
    msg = await channel.messages.fetch(DATA_MESSAGE_ID);
  } catch {
    const initData = { users: [] };
    const newMsg = await channel.send(`\`\`\`json\n${JSON.stringify(initData, null, 2)}\n\`\`\``);
    return { data: initData, message: newMsg };
  }
  const content = msg.content.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(content);
  return { data: parsed, message: msg };
}

// データ保存
async function saveData(message, data) {
  await message.edit(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
}

// infractions整理とカウント更新
function updateInfraction(target) {
  if (!target.infractions) target.infractions = [];
  target.count = Math.min(target.count || 0, 5);
  if (target.count >= 5) {
    // 停止
    if (!target.infractions.find(i => i.type === '停止')) {
      target.infractions.push({ type: '停止', date: new Date().toISOString() });
    }
    target.infractions = target.infractions.filter(i => i.type === '停止' || i.type === '厳重注意');
  } else if (target.count >= 4) {
    // 厳重注意
    if (!target.infractions.find(i => i.type === '厳重注意')) {
      target.infractions.push({ type: '厳重注意', date: new Date().toISOString() });
    }
    target.infractions = target.infractions.filter(i => i.type === '厳重注意' || i.type === '警告');
  } else if (target.count >= 1) {
    // 警告
    if (!target.infractions.find(i => i.type === '警告')) {
      target.infractions.push({ type: '警告', date: new Date().toISOString() });
    }
    target.infractions = target.infractions.filter(i => i.type === '警告');
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('警告システム')
    .addStringOption(opt => 
      opt.setName('type')
         .setDescription('処理種別')
         .setRequired(true)
         .addChoices(
           { name: '追加', value: 'add' },
           { name: '削除', value: 'remove' },
           { name: '履歴', value: 'list' },
           { name: '期限チェック', value: 'check' }
         )
    )
    .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー'))
    .addStringOption(opt => opt.setName('reason').setDescription('理由').addChoices(
      { name: 'ルール違反', value: 'ルール違反' },
      { name: 'いやがらせ', value: 'いやがらせ' },
      { name: '荒らし', value: '荒らし' }
    )),
    
  async execute(interaction) {
    const { client, member } = interaction;
    const type = interaction.options.getString('type');
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    // 権限チェック
    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);
    const isUser = ALLOWED_USER_ID.includes(member.id);
    if (!hasRole && !isUser) {
      await interaction.reply({ content: '❌ このコマンドを実行する権限がありません。', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const { data, message } = await loadData(client);

    // 期限切れチェック: 全ユーザー
    const now = dayjs().tz('Asia/Tokyo');
    for (const u of data.users) {
      if (u.infractions?.length) {
        const latest = dayjs(u.infractions[u.infractions.length - 1].date);
        if (latest.isBefore(now)) {
          u.infractions = [];
          u.count = 0;
        }
      }
    }

    // typeごとの処理
    if (type === 'add') {
      if (!user || !reason) {
        await interaction.editReply('❌ ユーザーと理由を指定してください。');
        return;
      }
      let target = data.users.find(u => u.id === user.id);
      if (!target) {
        target = { id: user.id, name: user.username, count: 0, infractions: [] };
        data.users.push(target);
      }
      target.count = Math.min((target.count || 0) + 1, 5);
      updateInfraction(target);
      await saveData(message, data);

      const latestInf = target.infractions[target.infractions.length - 1];
      const expiry = TIMEOUTS[latestInf.type] ? now.add(TIMEOUTS[latestInf.type], 'millisecond') : null;
      const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${latestInf.type}を付与しました`)
        .addFields(
          { name: '対象', value: `${user} (${user.id})` },
          { name: '理由', value: reason, inline: true },
          { name: '期限', value: expiry ? expiry.format('YYYY-MM-DD HH:mm') : 'なし', inline: true },
          { name: '現在の警告回数', value: `${target.count}`, inline: true },
          { name: '状況', value: latestInf.type, inline: true }
        )
        .setColor(0xffa500)
        .setTimestamp();
      try { await user.send({ embeds: [embed] }); } catch {}
      await interaction.editReply({ embeds: [embed] });

    } else if (type === 'remove') {
      if (!user) {
        await interaction.editReply('❌ ユーザーを指定してください。');
        return;
      }
      const target = data.users.find(u => u.id === user.id);
      if (!target || target.count <= 0) {
        await interaction.editReply('❌ 対象ユーザーの警告がありません。');
        return;
      }
      target.count = Math.max(target.count - 1, 0);
      updateInfraction(target);
      await saveData(message, data);
      await interaction.editReply(`✅ ${user.username} の警告を1減らしました。`);

    } else if (type === 'list') {
      if (!user) {
        await interaction.editReply('❌ ユーザーを指定してください。');
        return;
      }
      const target = data.users.find(u => u.id === user.id);
      if (!target || !target.infractions.length) {
        await interaction.editReply(`📘 ${user.username} さんには警告履歴がありません。`);
        return;
      }
      const list = target.infractions.map((i, idx) => `#${idx+1}: ${i.type}\n発行日: ${i.date}`).join('\n\n');
      const embed = new EmbedBuilder()
        .setTitle(`📋 ${user.username} の警告履歴`)
        .setDescription(list)
        .setColor(0x3498db);
      await interaction.editReply({ embeds: [embed] });

    } else if (type === 'check') {
      let removed = 0;
      for (const u of data.users) {
        if (u.infractions?.length) {
          const latest = dayjs(u.infractions[u.infractions.length - 1].date);
          if (latest.isBefore(now)) {
            removed += u.infractions.length;
            u.infractions = [];
            u.count = 0;
          }
        }
      }
      await saveData(message, data);
      await interaction.editReply(`🧹 ${removed} 件の期限切れ警告を削除しました。`);
    }
  }
};
