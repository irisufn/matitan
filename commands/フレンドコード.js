const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('フレンドコード')
    .setDescription('フレンドコードを表示'),

  async execute(interaction) {
    const TARGET_CHANNEL_ID = '1420393502293889165';
    const GUIDE_CHANNEL_ID = '1420395483247018155';

    try {
      const channel = interaction.client.channels.cache.get(TARGET_CHANNEL_ID);

      if (!channel) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('エラー')
              .setDescription('指定のチャンネルが見つかりません。')
              .setColor(0xFF0000),
          ],
          ephemeral: true,
        });
      }

      // メッセージ取得
      const messages = await fetchUpTo1000Messages(channel);
      const userMessages = messages.filter(m => m.author.id === interaction.user.id);
      const userMessage = userMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];

      if (!userMessage) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('フレンドコードが見つかりませんでした')
              .setDescription(`あなたのフレンドコードが見つかりませんでした。\n<#${GUIDE_CHANNEL_ID}> にフレンドコードを投稿してください。`)
              .setColor(0xFF0000),
          ],
          ephemeral: true,
        });
      }

      // フレンドコード抽出
      const match = userMessage.content.match(/(?:SW[-\s　,.]?)?(\d{4})[-\s　,.]?(\d{4})[-\s　,.]?(\d{4})/i);
      if (!match) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('フレンドコードが見つかりませんでした')
              .setDescription(`フレンドコードが見つかりません。\n<#${GUIDE_CHANNEL_ID}> に投稿してください。`)
              .setColor(0xFF0000),
          ],
          ephemeral: true,
        });
      }

      const code = `SW-${match[1]}-${match[2]}-${match[3]}`;

      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎮 フレンドコード')
            .setDescription(code)
            .setFooter({ text: 'スマホの方はフレンドコード長押しでコピーできます。' })
            .setColor(0xFFFF00),
        ],
      });

    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'コマンド実行中にエラーが発生しました',
          ephemeral: true,
        });
      }
    }
  },
};

// 最大1000件まで遡ってメッセージを取得
async function fetchUpTo1000Messages(channel) {
  let allMessages = [];
  let lastId;

  for (let i = 0; i < 10; i++) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    allMessages = allMessages.concat(Array.from(messages.values()));
    lastId = messages.last().id;

    if (allMessages.length >= 1000) break;
  }

  return allMessages;
}
