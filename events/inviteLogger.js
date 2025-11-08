const { EmbedBuilder, Events } = require('discord.js');

// 通知チャンネルID
const LOG_CHANNEL_ID = '1421663161647497357';

module.exports = {
  name: 'inviteLogger',
  /**
   * inviteCreate と inviteDelete の両方を処理
   */
  execute: async (client) => {
    // 招待作成
    client.on('inviteCreate', async (invite) => {
      try {
        const embed = new EmbedBuilder()
          .setTitle('🎟️ 招待リンクが作成されました')
          .setColor(0x00ff99)
          .addFields(
            { name: '作成者', value: invite.inviter ? `${invite.inviter.tag}` : '不明', inline: true },
            { name: 'チャンネル', value: `${invite.channel}`, inline: true },
            { name: '招待コード', value: `https://discord.gg/${invite.code}`, inline: true },
            { name: '⏱有効期限', value: invite.maxAge ? `${invite.maxAge / 60} 分` : '無期限', inline: true },
            { name: '最大使用回数', value: invite.maxUses ? `${invite.maxUses}` : '無制限', inline: true },
          )
          .setTimestamp();

        const logChannel = invite.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return console.warn(`⚠️ 通知チャンネル(${LOG_CHANNEL_ID})が見つかりません。`);

        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        console.error('❌ inviteCreate 処理中にエラー:', err);
      }
    });

    // 招待削除
    client.on('inviteDelete', async (invite) => {
      try {
        const embed = new EmbedBuilder()
          .setTitle('❌ 招待リンクが削除されました')
          .setColor(0xff0000)
          .addFields(
            { name: '作成者', value: invite.inviter ? `${invite.inviter.tag}` : '不明', inline: true },
            { name: 'チャンネル', value: `${invite.channel}`, inline: true },
            { name: '招待コード', value: `https://discord.gg/${invite.code}`, inline: true }
          )
          .setTimestamp();

        const logChannel = invite.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return console.warn(`⚠️ 通知チャンネル(${LOG_CHANNEL_ID})が見つかりません。`);

        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        console.error('❌ inviteDelete 処理中にエラー:', err);
      }
    });
  },
};
