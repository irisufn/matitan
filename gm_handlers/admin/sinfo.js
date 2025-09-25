const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message, args) => {
	// 管理者IDチェック
	const adminPath = path.join(__dirname, '../../data/admin.json');
	let adminList = [];
	try {
		adminList = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
	} catch (e) {
		await message.reply('管理者リストの読み込みに失敗しました');
		return;
	}
	if (!adminList.includes(message.author.id)) {
		await message.reply('管理者権限がありません');
		return;
	}

	const guild = message.guild;
	const name = guild.name;
	const id = guild.id;
	const owner = await guild.fetchOwner();
	const memberCount = guild.memberCount;
	const roleCount = guild.roles.cache.size;
	const channelCount = guild.channels.cache.size;
	const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;

	const embed = new EmbedBuilder()
		.setTitle(`サーバー情報`)
		.setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
		.addFields(
			{ name: 'サーバーID', value: id, inline: true },
			{ name: 'オーナー', value: `${owner.user.tag}`, inline: true },
			{ name: 'メンバー数', value: `${memberCount}`, inline: true },
			{ name: 'ロール数', value: `${roleCount}`, inline: true },
			{ name: 'チャンネル数', value: `${channelCount}`, inline: true },
			{ name: '作成日', value: createdAt, inline: false },
		)
		.setColor(0x00AE86)
		.setFooter({ text: `Requested by ${message.author.tag}` })
		.setTimestamp();

	await message.reply({ embeds: [embed] });
};
