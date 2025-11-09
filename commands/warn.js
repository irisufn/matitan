const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const ALLOWED_USER_ID = ['986615974243491880', '1340695645354328180'];
const ALLOWED_ROLE_ID = '1394113342876155914';
const DATA_CHANNEL_ID = '1422204415036752013';
const DATA_MESSAGE_ID = '1436925986594750496';

// expiry計算関数
function getExpiry(type, issuedDate) {
  const issued = dayjs(issuedDate).tz('Asia/Tokyo');
  switch (type) {
    case '警告': return null;
    case '厳重注意': return issued.add(10, 'minute');
    case '停止': return issued.add(1, 'day');
    default: return null;
  }
}

// データ読み込み・保存
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

// 警告追加
function addInfraction(target, type, reason, now) {
  const date = now.toISOString();
  const expiry = getExpiry(type, date);

  // infractions追加
  target.infractions.push({ type, reason, date, expiry: expiry ? expiry.toISOString() : null });

  // count更新
  target.count = Math.min(target.count ? target.count + 1 : 1, 5);

  // 状況整理
  let status;
  if (target.count >= 5) status = '停止';
  else if (target.count >= 4) status = '厳重注意';
  else status = '警告';

  return status;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('警告システム')
    .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('処理形式').setRequired(true)
      .addChoices(
        { name: 'add', value: 'add' },
        { name: 'remove', value: 'remove' },
        { name: 'list', value: 'list' }
      ))
    .addStringOption(opt => opt.setName('reason').setDescription('理由').setRequired(false)
      .addChoices(
        { name: 'ルール違反', value: 'ルール違反' },
        { name: 'いやがらせ', value: 'いやがらせ' },
        { name: '荒らし', value: '荒らし' }
      )),
  
  async execute(interaction) {
    const { client, member } = interaction;
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const reason = interaction.options.getString('reason');
    const now = new Date();

    // 権限チェック
    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);
    const isUser = ALLOWED_USER_ID.includes(member.id);
    if (!hasRole && !isUser) {
      await interaction.reply({ content: '❌ このコマンドを実行する権限がありません。', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const { data, message } = await loadData(client);

    let target = data.users.find(u => u.id === user.id);
    if (!target) {
      target = { id: user.id, name: user.username, count: 0, infractions: [] };
      data.users.push(target);
    }

    if (type === 'add') {
      const status = addInfraction(target, '警告', reason || 'ルール違反', now); // ここはcountに応じて厳重注意や停止に調整可能
      await saveData(message, data);

      const latest = target.infractions[target.infractions.length - 1];
      const expiryText = latest.expiry ? dayjs(latest.expiry).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss') : 'なし';

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${status}を付与しました`)
        .addFields(
          { name: '対象', value: `${user} (${user.id})` },
          { name: '理由', value: latest.reason, inline: true },
          { name: '期限', value: expiryText, inline: true },
          { name: '現在の警告回数', value: `${target.count}`, inline: true },
          { name: '状況', value: status, inline: true }
        )
        .setColor(0xffa500)
        .setTimestamp();

      try { await user.send({ embeds: [embed] }); } catch {}
      await interaction.editReply({ embeds: [embed] });
    }

    // remove
    else if (type === 'remove') {
      if (target.count <= 0) {
        await interaction.editReply('❌ このユーザーには警告がありません。');
        return;
      }
      target.count = Math.max(target.count - 1, 0);
      target.infractions.pop(); // 最後のinfractionsを削除
      await saveData(message, data);
      await interaction.editReply(`✅ ${user.username} の警告を1件削除しました。`);
    }

    // list
    else if (type === 'list') {
      if (!target.infractions.length) {
        await interaction.editReply(`📘 ${user.username} さんには警告履歴がありません。`);
        return;
      }

      const list = target.infractions.map((inf, i) => {
        const exp = inf.expiry ? dayjs(inf.expiry).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss') : 'なし';
        return `#${i + 1}: ${inf.type}（${inf.reason}） 期限: ${exp}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${user.username} の警告履歴`)
        .setDescription(list)
        .setColor(0x3498db);

      await interaction.editReply({ embeds: [embed] });
    }
  }
};
