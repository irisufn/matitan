const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MessageFlags } = require('discord-api-types/v10');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('BotのPing値を表示します。'),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('Ping値🏓')
        .setDescription(`${Math.round(interaction.client.ws.ping)} ms`)
        .setColor('#00AAFF')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
      }
      // すでに応答済みなら何もしない
    }
  }
};
