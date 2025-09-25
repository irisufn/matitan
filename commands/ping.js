const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping値を数秒計測して出力します。'),

  async execute(client, interaction) {
    await interaction.deferReply();

    const tries = 5; // 測定回数
    const samples = [];

    for (let i = 0; i < tries; i++) {
      const start = Date.now();
      await interaction.fetchReply(); // API呼び出しでPingを計測
      const end = Date.now();
      const ping = end - start;
      if (ping > 0) samples.push(ping); // -1msなど不正値を除外
    }

    const averagePing = samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : '不明';

    const embed = new EmbedBuilder()
      .setTitle('🏓 Ping測定結果')
      .addFields(
        { name: '平均Ping', value: `${averagePing} ms`, inline: true },
        { name: 'Bot API Ping', value: `${Math.round(client.ws.ping)} ms`, inline: true }
      )
      .setColor('#00AAFF')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
