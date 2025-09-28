const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config.json');

// 定数
const ROLE_ID = '1399382918324813965'; // 認証ロールのID
const REMOVE_ROLE_ID = '1398719394049298472'; // 削除対象ロールのID
const REQUIRED_PERMISSIONS = PermissionsBitField.Flags.ManageRoles; // ボットに要求される権限
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000; // 1週間(ms)

async function sendErrorLog(guild, user, role, title, description, error = null) {
  try {
    const channel = guild.channels.cache.get(config.error_channel_id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .addFields(
        { name: '実行ユーザー', value: `<@${user.id}>`, inline: true },
        { name: '対象ロール', value: role ? `<@&${role.id}>` : '不明', inline: true }
      )
      .setTimestamp();

    if (error) {
      embed.addFields({ name: '詳細', value: `\`\`\`${error.message || error}\`\`\`` });
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('エラーログ送信に失敗:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('認証')
    .setDescription('指定のロールを付与します'),

  async execute(interaction) {
    const { guild, member } = interaction;
    const role = guild.roles.cache.get(ROLE_ID);

    if (!role) {
      const errorMsg = '指定されたロールが見つかりません。ロールIDが正しいか確認してください。';
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('エラー').setDescription(errorMsg)],
        ephemeral: true,
      });
      sendErrorLog(guild, member.user, role, 'ロール未検出', errorMsg);
      return;
    }

    if (!guild.members.me.permissions.has(REQUIRED_PERMISSIONS)) {
      const errorMsg = 'ボットにロール管理の権限がありません。必要な権限を付与してください。';
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('エラー').setDescription(errorMsg)],
        ephemeral: true,
      });
      sendErrorLog(guild, member.user, role, '権限不足', errorMsg);
      return;
    }

    if (role.position >= guild.members.me.roles.highest.position) {
      const errorMsg = 'ボットのロールが付与対象より低いため付与できません。';
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('エラー').setDescription(errorMsg)],
        ephemeral: true,
      });
      sendErrorLog(guild, member.user, role, 'ロール階層エラー', errorMsg);
      return;
    }

    if (member.roles.cache.has(ROLE_ID)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Blue').setTitle('認証済み').setDescription('あなたは認証済みです。')],
        ephemeral: true,
      });
    }

    // ✅ サーバー参加から1週間経過しているかチェック
    const joinedAt = member.joinedAt;
    if (Date.now() - joinedAt.getTime() < ONE_WEEK) {
      const errorMsg = 'サーバー参加から1週間未満のため認証できません。';
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red').setTitle('エラー').setDescription(errorMsg)],
        ephemeral: true,
      });
      sendErrorLog(guild, member.user, role, '認証制限', errorMsg);
      return;
    }

    try {
      // 認証ロールを付与
      await member.roles.add(role);
      const successEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('認証完了')
        .setDescription(`${role.name}を付与しました。`)
        .setThumbnail('https://images.emojiterra.com/twitter/v13.1/512px/2705.png');
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      // ✅ 付与後にREMOVE_ROLE_IDを持っていたら削除
      const removeRole = guild.roles.cache.get(REMOVE_ROLE_ID);
      if (removeRole && member.roles.cache.has(REMOVE_ROLE_ID)) {
        await member.roles.remove(removeRole);
        console.log(`ユーザー ${member.user.tag} からロール ${removeRole.name} を削除しました。`);
      }

    } catch (error) {
      console.error(error);
      const errorMsg = '不明なエラーが発生しました。';
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor('Red').setTitle('エラー').setDescription(errorMsg)],
          ephemeral: true,
        });
      }
      sendErrorLog(guild, member.user, role, '実行時エラー', errorMsg, error);
    }
  },
};
