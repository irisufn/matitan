const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping値を表示します。'),

  async execute(client, interaction) {
    await interaction.deferReply();

    const tries = 5;
    const samples = [];

    for (let i = 0; i < tries; i++) {
      const t0 = Date.now();
      const msg = await interaction.followUp({ content: `測定中…`, fetchReply: true });
      samples.push(Date.now() - t0);

      try { await msg.delete(); } catch {}
      await new Promise(r => setTimeout(r, 100));
    }

    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length * 10) / 10;

    const embed = new EmbedBuilder()
      .setDescription(`${avg}`) // 数値のみ
      .setFooter({ text: `${Math.round(client.ws.ping)}` }) // 必要なら WS ping も数値のみ
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
