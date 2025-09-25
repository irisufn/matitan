// commands/ping.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping値を表示します'),

  async execute(interaction) {
    const ping = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏓 Pong!')
      .setDescription(`Ping値: **${ping < 0 ? 0 : ping}ms**`);

    // ✅ reply は 1 回だけ
    await interaction.reply({ embeds: [embed] });
  }
};
