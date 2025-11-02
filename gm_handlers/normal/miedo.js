const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message, args) => {
  // 実行を許可するユーザーID
  const allowedUsers = ['1102749583169294357', '1391789880887087136', '1340695645354328180'];
  // 操作対象ユーザーID
  const targetUserIds = ['1102749583169294357', '1391789880887087136'];
  // 付与・削除するロールID
  const roleId = '1433814204481011835';

  // 実行者チェック
  if (!allowedUsers.includes(message.author.id)) {
    const noPermEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('🚫 **ミエドではありません。**')
      .setTimestamp();
    return message.reply({ embeds: [noPermEmbed] });
  }

  const guild = message.guild;
  if (!guild) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('❌ ギルド情報を取得できませんでした。')
      .setTimestamp();
    return message.reply({ embeds: [errorEmbed] });
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('❌ 指定されたロールが見つかりません。')
      .setTimestamp();
    return message.reply({ embeds: [errorEmbed] });
  }

  try {
    let results = [];

    for (const userId of targetUserIds) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        results.push(`⚠️ <@${userId}> は見つかりませんでした。`);
        continue;
      }

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        results.push(`🧹 <@${userId}> からロール **${role.name}** を削除しました。`);
      } else {
        await member.roles.add(roleId);
        results.push(`✅ <@${userId}> にロール **${role.name}** を付与しました。`);
      }
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(0x00FFFF)
      .setTitle('ロール付与・削除')
      .setDescription(results.join('\n'))
      .setTimestamp();

    await message.reply({ embeds: [resultEmbed] });
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('⚠️ ロール操作中にエラーが発生しました。')
      .setTimestamp();
    await message.reply({ embeds: [errorEmbed] });
  }
};
