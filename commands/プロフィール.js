const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('プロフィール')
		.setDescription('あなたのプロフィール情報を表示します'),

	/**
	 * スラッシュコマンド・メッセージコマンド両対応
	 * @param {Client} client
	 * @param {Interaction|Message} interactionOrMessage
	 * @param {Array} [args]
	 */
	async execute(client, interactionOrMessage, args) {
		let user, member;
		if (interactionOrMessage.isChatInputCommand && interactionOrMessage.isChatInputCommand()) {
			user = interactionOrMessage.user;
			member = interactionOrMessage.member;
		} else {
			user = interactionOrMessage.author;
			member = interactionOrMessage.member;
		}

		// ロール一覧（@everyone を除外）
		const roles = member ? member.roles.cache
			.filter(r => r.id !== member.guild.id)
			.map(r => r.toString())
			.join(', ') || 'なし'
			: '不明';

		const embed = new EmbedBuilder()
			.setTitle(`${user.username} のプロフィール`)
			.setThumbnail(user.displayAvatarURL({ size: 1024 }))
			.addFields(
				{ name: 'ユーザー名', value: user.tag, inline: true },
				{ name: 'ユーザーID', value: user.id, inline: true },
				{ name: 'アカウント作成日', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
			)
			.setColor(0x00AE86)
			.setTimestamp();

		if (member && member.joinedTimestamp) {
			embed.addFields({ name: 'サーバー参加日', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false });
		}

		embed.addFields({ name: 'ロール', value: roles, inline: false });

		if (interactionOrMessage.isChatInputCommand && interactionOrMessage.isChatInputCommand()) {
			await interactionOrMessage.reply({ embeds: [embed], ephemeral: true });
		} else {
			await interactionOrMessage.reply({ embeds: [embed] });
		}
	},
};
