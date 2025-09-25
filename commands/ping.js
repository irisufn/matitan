const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('BotのPing値を表示します。'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Ping値🏓')
      .setDescription(`${Math.max(Math.round(interaction.client.ws.ping), 0)} ms`) // -1ms防止
      .setColor('#00AAFF')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
