const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 実行を許可するユーザーID・ロールID
const ALLOWED_USER_ID = '986615974243491880';
const ALLOWED_ROLE_ID = '1394113342876155914';

// JSON管理チャンネルIDとメッセージID
const DATA_CHANNEL_ID = 'ここにチャンネルIDを入力';
const DATA_MESSAGE_ID = 'ここに固定メッセージIDを入力';

// 🔽 データ読み込み・保存関数
async function loadData(client) {
  const channel = await client.channels.fetch(DATA_CHANNEL_ID);

  let msg;
  try {
    msg = await channel.messages.fetch(DATA_MESSAGE_ID);
  } catch {
    // メッセージが存在しない場合は作成
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

// 🔽 コマンド定義
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
        .addStringOption(opt => opt.setName('reason').setDescription('理由').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('日数').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('ユーザーの警告履歴を表示')
        .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('check')
        .setDescription('期限切れの警告を削除')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('個別の警告を削除')
        .addUserOption(opt => opt.setName('user').setDescription('対象ユーザー').setRequired(true))
        .addIntegerOption(opt => opt.setName('id').setDescription('削除する警告番号').setRequired(true))
    ),

  async execute(interaction) {
    const { client, member } = interaction;
    const sub = interaction.options.getSubcommand();

    // 🔒 権限チェック
    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);
    const isUser = member.id === ALLOWED_USER_ID;
    if (!hasRole && !isUser) {
      await interaction.reply({ content: '❌ このコマンドを実行する権限がありません。', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const { data, message } = await loadData(client);

    const now = new Date();

    // 📕 /warn add
    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      const reason = interaction.options.getString('reason');
      const duration = interaction.options.getInteger('duration');
      const date = now.toISOString().split('T')[0];

      let target = data.users.find(u => u.id === user.id);
      if (!target) {
        target = { id: user.id, name: user.username, infractions: [] };
        data.users.push(target);
      }

      target.infractions.push({ type, reason, date, duration });
      await saveData(message, data);

      const embed = new EmbedBuilder()
        .setTitle('⚠️ 警告を追加しました')
        .addFields(
          { name: '対象', value: `${user} (${user.id})` },
          { name: '種類', value: type, inline: true },
          { name: '理由', value: reason, inline: true },
          { name: '期間', value: `${duration}日`, inline: true },
        )
        .setColor(0xffa500)
        .setTimestamp();

      // DM送信を試みる
      let dmFailed = false;
      try {
        await user.send({ embeds: [embed] });
      } catch {
        dmFailed = true;
      }

      if (dmFailed) embed.setDescription('※DM送信に失敗しました');

      await interaction.editReply({ embeds: [embed] });
    }

    // 📗 /warn list
    else if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const target = data.users.find(u => u.id === user.id);

      if (!target || target.infractions.length === 0) {
        await interaction.editReply(`📘 ${user.username} さんには警告履歴がありません。`);
        return;
      }

      const list = target.infractions.map((inf, i) => {
        const issued = new Date(inf.date);
        const diffDays = Math.floor((now - issued) / (1000 * 60 * 60 * 24));
        const remaining = inf.duration - diffDays;
        return `#${i + 1}: ${inf.type}（${inf.reason}）\n発行日: ${inf.date} / 残り: ${remaining > 0 ? `${remaining}日` : '期限切れ'}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${user.username} の警告履歴`)
        .setDescription(list)
        .setColor(0x3498db);

      await interaction.editReply({ embeds: [embed] });
    }

    // 🧹 /warn check
    else if (sub === 'check') {
      let removed = 0;
      for (const user of data.users) {
        const before = user.infractions.length;
        user.infractions = user.infractions.filter(inf => {
          const issued = new Date(inf.date);
          const diffDays = (now - issued) / (1000 * 60 * 60 * 24);
          return diffDays < inf.duration;
        });
        removed += before - user.infractions.length;
      }

      await saveData(message, data);
      await interaction.editReply(`🧹 ${removed} 件の期限切れ警告を削除しました。`);
    }

    // ❌ /warn remove
    else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const id = interaction.options.getInteger('id');

      const target = data.users.find(u => u.id === user.id);
      if (!target || target.infractions.length < id || id <= 0) {
        await interaction.editReply(`❌ 指定した警告IDは存在しません。`);
        return;
      }

      target.infractions.splice(id - 1, 1);
      await saveData(message, data);

      await interaction.editReply(`✅ ${user.username} の警告 #${id} を削除しました。`);
    }
  }
};
