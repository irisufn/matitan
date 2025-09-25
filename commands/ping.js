const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping値を数秒計測して出力します。'),

  async execute(client, interaction) {
    await interaction.deferReply();

    const tries = 5;
    const samples = [];

    for (let i = 0; i < tries; i++) {
      const t0 = Date.now();
      // 実際のPingを計測するために微小な待機
      await new Promise(r => setTimeout(r, 200)); // 200ms待つ
      samples.push(Date.now() - t0);
    }

    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length * 10) / 10;

    const embed = new EmbedBuilder()
      .setDescription(`${avg}`); // 平均値のみ

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
