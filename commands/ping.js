const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Ping値を計測します'),

	/**
	 * スラッシュコマンド専用
	 * @param {Client} client
	 * @param {Interaction} interaction
	 */
	async execute(client, interaction) {
		// 計測開始通知
		await interaction.reply({ content: `計測中... 🛰️`, ephemeral: true });

		// 複数回計測
		const attempts = 5; // 計測回数
		const interval = 500; // 計測間隔(ms)
		const results = [];

		for (let i = 0; i < attempts; i++) {
			results.push(client.ws.ping);
			await new Promise(r => setTimeout(r, interval));
		}

		// 平均値（-1 は除外）
		const validResults = results.filter(v => v >= 0);
		const avg = validResults.length > 0
			? Math.round(validResults.reduce((a, b) => a + b, 0) / validResults.length)
			: "計測失敗";

		// Embed 作成
		const embed = new EmbedBuilder()
			.setColor(0x00AE86)
			.setTitle('🏓 Pong!')
			.addFields(
				{ name: '平均レイテンシ', value: `${avg}ms`, inline: true },
				{ name: '計測値一覧', value: validResults.map(v => `${v}ms`).join(' / '), inline: true },
			)
			.setFooter({ text: `計測回数: ${validResults.length}/${attempts}` })
			.setTimestamp();

		// 結果送信（ephemeralで本人のみ）
		await interaction.editReply({ content: '', embeds: [embed] });
	},
};
