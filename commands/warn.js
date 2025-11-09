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

// expiry計算（期限）
function getExpiry(status) {
  const now = dayjs().tz('Asia/Tokyo');
  switch (status) {
    case '警告': return now.add(1, 'day');
    case '厳重注意': return now.add(3, 'day');
    case '停止': return now.add(5, 'day');
    default: return null;
  }
}

// count から状況を取得
function getStatus(count) {
  if (count >= 5) return '停止';
  if (count >= 4) return '厳重注意';
  return '警告';
}

// ステータスごとの色
function getColor(status) {
  switch (status) {
    case '警告': return 0xFFFF00; // 黄色
    case '厳重注意': return 0xFFA500; // オレンジ
    case '停止': return 0xFF0000; // 赤
    default: return 0xFFFFFF;
  }
}

// タイムアウト処理
async function applyTimeout(member, status) {
  if (status === '警告') return; // 警告はタイムアウトなし
  const duration = status === '厳重注意' ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000; // Discordタイムアウト
  try { await member.timeout(duration, `自動 ${status}`); } catch {}
}

// タイムアウト解除
async function removeTimeout(member) {
  try { await member.timeout(null, 'タイムアウト解除'); } catch {}
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
    const { client, member, guild } = interaction;
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const reason = interaction.options.getString('reason') || 'ルール違反';

    // 権限チェック
    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);
    const isUser = ALLOWED_USER_ID.includes(member.id);
    if (!hasRole && !isUser) {
      await interaction.reply({ content: '❌ このコマンドを実行する権限がありません。', ephemeral: true });
      return;
    }

    // deferReply
    await interaction.deferReply({ ephemeral: true });

    // データ読み込み
    const { data, message } = await loadData(client);

    // 対象ユーザーの infractions 確認/作成
    let target = data.users.find(u => u.id === user.id);
    if (!target) {
      target = { id: user.id, name: user.username, count: 0, infractions: [] };
      data.users.push(target);
    }

    const memberObj = guild.members.cache.get(user.id);

    // remove前にexpiry確認して期限切れなら infractions 削除
    if (type === 'remove' && target.infractions.length) {
      const latest = target.infractions[target.infractions.length - 1];
      if (latest.expiry && dayjs(latest.expiry).isBefore(dayjs().tz('Asia/Tokyo'))) {
        target.infractions = [];
        target.count = 0;
      }
    }

    if (type === 'add') {
      // count 更新 / status 確定 / expiry 計算
      target.count = Math.min(target.count + 1, 5);
      const status = getStatus(target.count);
      const expiry = getExpiry(status);

      // infractions 配列に追加
      target.infractions.push({
        type: status,
        reason,
        date: dayjs().tz('Asia/Tokyo').toISOString(),
        expiry: expiry ? expiry.toISOString() : null
      });

      // タイムアウト適用
      await applyTimeout(memberObj, status);

      // データ保存
      await saveData(message, data);

      // DM向け embed 作成
      const dmEmbed = new EmbedBuilder()
        .setTitle(`${status}を受けました`)
        .setDescription(`理由: ${reason}`)
        .addFields(
          { name: '状況', value: status, inline: true },
          { name: '期限', value: expiry ? expiry.format('YYYY-MM-DD HH:mm:ss') : 'なし', inline: true }
        )
        .setColor(getColor(status))
        .setTimestamp();

      // DM送信（await してもOK、interaction.editReply はまだ）
      try { await user.send({ embeds: [dmEmbed] }); } catch {}

      // 実行者向け embed 作成
      const replyEmbed = new EmbedBuilder()
        .setTitle(`⚠️ ${status}を付与しました`)
        .addFields(
          { name: '対象', value: `${user} (${user.id})` },
          { name: '理由', value: reason, inline: true },
          { name: '期限', value: expiry ? expiry.format('YYYY-MM-DD HH:mm:ss') : 'なし', inline: true },
          { name: '現在の警告回数', value: `${target.count}`, inline: true },
          { name: '状況', value: status, inline: true }
        )
        .setColor(getColor(status))
        .setTimestamp();

      // interaction返信
      await interaction.editReply({ embeds: [replyEmbed] });
    }

    else if (type === 'remove') {
      if (target.count <= 0) {
        await interaction.editReply('❌ このユーザーには警告がありません。');
        return;
      }

      const oldStatus = getStatus(target.count);
      target.count = Math.max(target.count - 1, 0);
      const newStatus = getStatus(target.count);

      if (target.infractions.length) target.infractions.pop();

      if (oldStatus !== newStatus) {
        await removeTimeout(memberObj);
        await applyTimeout(memberObj, newStatus);
      }

      await saveData(message, data);
      await interaction.editReply(`✅ ${user.username} の警告を1件削除しました。`);
    }

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
