const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message, args) => {
  // 許可されたユーザーID
  const allowedUsers = ['1102749583169294357', '1391789880887087136', '1340695645354328180'];
  
  // 実行ユーザー確認
  if (!allowedUsers.includes(message.author.id)) {
    const noPermEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('🚫 **ミエドではありません。**')
      .setTimestamp();
    return message.reply({ embeds: [noPermEmbed] });
  }

  // 対象ロールID
  const roleId = '1433814204481011835';
  const member = message.member;

  if (!member) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('❌ メンバー情報を取得できませんでした。')
      .setTimestamp();
    return message.reply({ embeds: [errorEmbed] });
  }

  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('❌ 指定されたロールが見つかりません。')
      .setTimestamp();
    return message.reply({ embeds: [errorEmbed] });
  }

  try {
    if (member.roles.cache.has(roleId)) {
      // ロール削除
      await member.roles.remove(roleId);
      const removedEmbed = new EmbedBuilder()
        .setColor(0x0000FF)
        .setDescription(`🧹 ロール **${role.name}** を削除しました。`)
        .setTimestamp();
      await message.reply({ embeds: [removedEmbed] });
    } else {
      // ロール付与
      await member.roles.add(roleId);
      const addedEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setDescription(`✅ ロール **${role.name}** を付与しました。`)
        .setTimestamp();
      await message.reply({ embeds: [addedEmbed] });
    }
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription('⚠️ ロール操作中にエラーが発生しました。')
      .setTimestamp();
    await message.reply({ embeds: [errorEmbed] });
  }
};
