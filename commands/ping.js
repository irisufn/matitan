const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('コマンド実行中にエラーが発生しました');
      } else {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
      }
    }
  }
};
