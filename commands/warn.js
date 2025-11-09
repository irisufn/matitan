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

  // 期限切れチェック
  const now = dayjs().tz('Asia/Tokyo');
  for (const user of parsed.users) {
    if (!user.infractions) continue;
    const latestInfraction = user.infractions[user.infractions.length - 1];
    if (latestInfraction) {
      const expiry = latestInfraction.expiry ? dayjs(latestInfraction.expiry) : null;
      if (expiry && now.isAfter(expiry)) {
        user.infractions = [];
        user.count = 0;
      }
    }
  }

  return { data: parsed, message: msg };
}

async function saveData(message, data) {
  await message.edit(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
}

// infractions 更新
function addInfraction(target, now) {
  target.count = (target.count || 0) + 1;
  if (target.count > 5) target.count = 5;

  // infractions 初期化
  if (!target.infractions) target.infractions = [];

  let type, duration;
  if (target.count >= 5) {
    type = '停止';
    duration = dayjs(now).add(1, 'day').toISOString();
  } else if (target.count >= 4) {
    type = '厳重注意';
    duration = dayjs(now).add(10, 'minute').toISOString();
  } else {
    type = '警告';
    duration = null;
  }

  // 重複チェック
  if (!target.infractions.some(i => i.type === type)) {
    target.infractions.push({
      type,
      date: now.toISOString(),
      expiry: duration
    });
  }

  return type;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('警告システム')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('操作の種類')
        .setRequired(true)
        .addChoices(
          { name: 'add', value: 'add' },
          { name: 'remove', value: 'remove' },
          { name: 'list', value: 'list' }
        )
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('対象ユーザー')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('理由')
        .setRequired(false)
        .addChoices(
          { name: 'ルール違反', value: 'ルール違反' },
          { name: 'いやがらせ', value: 'いやがらせ' },
          { name: '荒らし', value: '荒らし' }
        )
    ),

  async execute(interaction) {
    const { client, member } = interaction;
    const type = interaction.options.getString('type');
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'なし';

    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);
    const isUser = ALLOWED_USER_ID.includes(member.id);
    if (!hasRole && !isUser) {
      await interaction.reply({ content: '❌ このコマンドを実行する権限がありません。', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const { data, message } = await loadData(client);
    const now = dayjs().tz('Asia/Tokyo');

    let target = data.users.find(u => u.id === user.id);
    if (!target) {
      target = { id: user.id, name: user.username, count: 0, infractions: [] };
      data.users.push(target);
    }

    if (type === 'add') {
      const infractionType = addInfraction(target, now);

      await saveData(message, data);

      const expiryText = target.infractions.find(i => i.type === infractionType)?.expiry
        ? dayjs(target.infractions.find(i => i.type === infractionType).expiry).format('YYYY-MM-DD HH:mm:ss')
        : 'なし';

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${infractionType} が追加されました`)
        .addFields(
          { name: '対象', value: `${user} (${user.id})` },
          { name: '理由', value: reason, inline: true },
          { name: '期限', value: expiryText, inline: true },
          { name: '現在の警告回数', value: `${target.count}`, inline: true },
          { name: '状況', value: infractionType, inline: true },
        )
        .setColor(0xffa500)
        .setTimestamp();

      try { await user.send({ embeds: [embed] }); } catch {}
      await interaction.editReply({ embeds: [embed] });
    }
    else if (type === 'list') {
      if (!target.infractions.length) {
        await interaction.editReply(`📘 ${user.username} さんには警告履歴がありません。`);
        return;
      }

      const list = target.infractions.map((inf, i) => {
        const expiry = inf.expiry ? dayjs(inf.expiry).format('YYYY-MM-DD HH:mm:ss') : 'なし';
        return `#${i + 1}: ${inf.type}\n発行日: ${dayjs(inf.date).format('YYYY-MM-DD HH:mm:ss')} / 期限: ${expiry}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${user.username} の警告履歴`)
        .setDescription(list)
        .setColor(0x3498db);

      await interaction.editReply({ embeds: [embed] });
    }
    else if (type === 'remove') {
      if (target.count <= 0) {
        await interaction.editReply(`❌ ${user.username} に警告はありません。`);
        return;
      }

      // count を 1 下げる
      target.count = target.count - 1;

      // 状況に応じて infractions を整理
      if (target.count < 4) {
        target.infractions = target.infractions.filter(i => i.type !== '停止');
      }
      if (target.count < 1) {
        target.infractions = [];
      }
      await saveData(message, data);

      const embed = new EmbedBuilder()
        .setTitle(`✅ ${user.username} の警告を削除しました`)
        .addFields(
          { name: '現在の警告回数', value: `${target.count}`, inline: true },
        )
        .setColor(0x2ecc71)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};
