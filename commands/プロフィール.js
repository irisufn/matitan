const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('プロフィール')
    .setDescription('あなたのプロフィール情報を表示します'),

  async execute(interaction) {
    try {
      let user = interaction.user;
      let member = interaction.member;

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

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: 'コマンド実行中にエラーが発生しました',
          ephemeral: true
        });
      }
    }
  },
};
