const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Ping値を計測します'),

	/**
	 * スラッシュコマンド・メッセージコマンド両対応
	 * @param {Client} client
	 * @param {Interaction|Message} interactionOrMessage
	 * @param {Array} [args]
	 */
	async execute(client, interactionOrMessage, args) {
		// スラッシュコマンド
		if (interactionOrMessage.isChatInputCommand && interactionOrMessage.isChatInputCommand()) {
			await interactionOrMessage.reply({ content: `計算中`, ephemeral: true });
			await interactionOrMessage.editReply({ content: `Pong! APIレイテンシ : ${Math.round(client.ws.ping)}ms 🛰️`, ephemeral: true });
		} else {
			// メッセージコマンド
			await interactionOrMessage.reply(`Pong! APIレイテンシ : ${Math.round(client.ws.ping)}ms 🛰️`);
		}
	},
};
