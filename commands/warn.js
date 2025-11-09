const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// 実行を許可するユーザーID・ロールID・サーバーID
const ALLOWED_USER_ID = '986615974243491880';
const ALLOWED_ROLE_ID = '1394113342876155914';
const ALLOWED_GUILD_IDS = ['1419130447535013952']; // 追加で許可するサーバーID


// JSON管理チャンネルIDとメッセージID
const DATA_CHANNEL_ID = '1422204415036752013';
const DATA_MESSAGE_ID = '1436925986594750496';

// 🔽 データ読み込み・保存関数
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

async function saveData(message, data) {
  await message.edit(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
}

// 🔽 警告処理
function addInfraction(target, type, reason, duration, now) {
  const date = now.toISOString().split('T')[0];
  target.infractions.push({ type, reason, date, duration });

  // count 更新
  const counts = { '警告': 1, '厳重注意': 4, '停止': 5 };
  target.count = Math.min(target.count ? target.count + 1 : 1, 5);

  // infractions整理
  const types = [];
  if (target.count >= 1) types.push('警告');
  if (target.count >= 4) types.push('厳重注意');
  if (target.count >= 5) types.push('停止');

  // すでに infractions に存在するtypeは重複させない
  target.infractions = target.infractions.filter(i => types.includes(i.type));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('警告システム')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('ユーザーに警告・厳重注意・停止を追加')
        .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('種類').setRequired(true).addChoices(
          { name: '警告', value: '警告' },
          { name: '厳重注意', value: '厳重注意' },
          { name: '停止', value: '停止' }
        ))
        .addStringOption(opt => opt.setName('reason').setDescription('理由').setRequired(true).addChoices(
          { name: 'ルール違反', value: 'ルール違反' },
          { name: 'いやがらせ', value: 'いやがらせ' },
          { name: '荒らし', value: '荒らし' }
        ))
        .addIntegerOption(opt => opt.setName('duration').setDescription('日数').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('個別の警告を削除')
        .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(true))
        .addIntegerOption(opt => opt.setName('id').setDescription('削除する警告番号').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('ユーザーの警告履歴を表示')
        .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('check')
        .setDescription('期限切れの警告を全ユーザーから削除')
    ),

  async execute(interaction) {
    const { client, member } = interaction;
    const sub = interaction.options.getSubcommand();
    const inAllowedGuild = ALLOWED_GUILD_IDS.includes(interaction.guildId);

    // 🔒 権限チェック
    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);
    const isUser = member.id === ALLOWED_USER_ID;
    if (!hasRole && !isUser && !inAllowedGuild) {
      await interaction.reply({ content: '❌ このコマンドを実行する権限がありません。', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const { data, message } = await loadData(client);
    const now = new Date();

    // 📕 add
    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      const reason = interaction.options.getString('reason');
      const duration = interaction.options.getInteger('duration');

      let target = data.users.find(u => u.id === user.id);
      if (!target) {
        target = { id: user.id, name: user.username, infractions: [], count: 0 };
        data.users.push(target);
      }

      addInfraction(target, type, reason, duration, now);
      await saveData(message, data);

      const embed = new EmbedBuilder()
        .setTitle('⚠️ 警告を追加しました')
        .addFields(
          { name: '対象', value: `${user} (${user.id})` },
          { name: '種類', value: type, inline: true },
          { name: '理由', value: reason, inline: true },
          { name: '期間', value: `${duration}日`, inline: true },
          { name: '現在の警告回数', value: `${target.count}`, inline: true },
        )
        .setColor(0xffa500)
        .setTimestamp();

      // DM送信
      try { await user.send({ embeds: [embed] }); } catch {}

      await interaction.editReply({ embeds: [embed] });
    }

    // 📗 list
    else if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const target = data.users.find(u => u.id === user.id);

      if (!target || !target.infractions.length) {
        await interaction.editReply(`📘 ${user.username} さんには警告履歴がありません。`);
        return;
      }

      const list = target.infractions.map((inf, i) => {
        const issued = dayjs(inf.date);
        const expiry = issued.add(inf.duration || 0, 'day');
        return `#${i + 1}: ${inf.type}（${inf.reason}）\n発行日: ${inf.date} / 期限: ${expiry.format('YYYY-MM-DD')}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${user.username} の警告履歴`)
        .setDescription(list)
        .setColor(0x3498db);

      await interaction.editReply({ embeds: [embed] });
    }

    // 🧹 check
    else if (sub === 'check') {
      let removed = 0;
      const nowDayjs = dayjs();
      for (const user of data.users) {
        const before = user.infractions.length;
        user.infractions = user.infractions.filter(inf => {
          const expiry = dayjs(inf.date).add(inf.duration || 0, 'day');
          return expiry.isAfter(nowDayjs);
        });
        removed += before - user.infractions.length;
        if (!user.infractions.length) user.count = 0;
      }

      await saveData(message, data);
      await interaction.editReply(`🧹 ${removed} 件の期限切れ警告を削除しました。`);
    }

    // ❌ remove
    else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const id = interaction.options.getInteger('id');
      const target = data.users.find(u => u.id === user.id);

      if (!target || target.infractions.length < id || id <= 0) {
        await interaction.editReply(`❌ 指定した警告IDは存在しません。`);
        return;
      }

      target.infractions.splice(id - 1, 1);
      target.count = Math.max(target.count - 1, 0);
      await saveData(message, data);

      await interaction.editReply(`✅ ${user.username} の警告 #${id} を削除しました。`);
    }
  }
};
