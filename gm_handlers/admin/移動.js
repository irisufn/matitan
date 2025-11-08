// gm_handlers/admin/move.js
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = async (client, message, args) => {
  // ===== 実行権限チェック =====
  const ALLOWED_USER_ID = '986615974243491880';
  const ALLOWED_ROLE_ID = '1394113342876155914';

  const member = message.member;
  const hasPermission =
    member.id === ALLOWED_USER_ID ||
    member.roles.cache.has(ALLOWED_ROLE_ID);

  if (!hasPermission) {
    return message.reply('このコマンドを実行する権限がありません。');
  }

  // ===== 引数チェック =====
  if (args.length < 4) {
    return message.reply('使用方法: `!adm move <元VCのID> <移動先VCのID> <対象者>`');
  }

  const fromChannelId = args[1];
  const toChannelId = args[2];
  const targetArg = args[3];
  const guild = message.guild;

  const fromChannel = guild.channels.cache.get(fromChannelId);
  const toChannel = guild.channels.cache.get(toChannelId);

  if (!fromChannel || fromChannel.type !== 2) {
    return message.reply('元のボイスチャンネルが見つかりません。');
  }
  if (!toChannel || toChannel.type !== 2) {
    return message.reply('移動先のボイスチャンネルが見つかりません。');
  }

  const botMember = guild.members.me;
  if (!botMember.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
    return message.reply('BOTに「メンバーを移動」する権限がありません。');
  }

  // 対象メンバーの取得
  let membersToMove = [];

  if (targetArg.toLowerCase() === 'all') {
    membersToMove = fromChannel.members.filter(m => !m.user.bot);
  } else {
    const targetIds = targetArg.split(',').map(id => id.trim());
    membersToMove = targetIds
      .map(id => fromChannel.members.get(id))
      .filter(m => m);
  }

  if (membersToMove.size === 0 || membersToMove.length === 0) {
    return message.reply('対象者が見つかりません。');
  }

  const membersArray = membersToMove instanceof Map ? [...membersToMove.values()] : membersToMove;

  const successMembers = [];
  const failMembers = [];

  for (const member of membersArray) {
    try {
      await member.voice.setChannel(toChannel);
      successMembers.push(member);
    } catch (err) {
      failMembers.push(member);
      console.warn(`移動失敗: ${member.user.tag} (${member.id})`);
    }
  }

  // Embed構築
  const embed = new EmbedBuilder()
    .setTitle('メンバー移動')
    .setColor(successMembers.length > 0 ? 0x00BFFF : 0xFF5555)
    .setTimestamp();

  if (successMembers.length > 0) {
    embed.addFields({
      name: `✅ 成功 (${successMembers.length}人)`,
      value: successMembers.map(m => `${m.user.tag}`).join('\n'),
      inline: false,
    });
  }

  if (failMembers.length > 0) {
    embed.addFields({
      name: `⚠️ 失敗 (${failMembers.length}人)`,
      value: failMembers.map(m => `${m.user.tag}`).join('\n'),
      inline: false,
    });
  }

  await message.channel.send({ embeds: [embed] });
};
