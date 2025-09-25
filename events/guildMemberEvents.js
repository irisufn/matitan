// events/guildMemberEvents.js
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1420404689991762060'; // ←ここを設定

module.exports = [
  {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
      console.log(`[参加] ${member.user.tag} がサーバーに参加しました。`);

      // 通知チャンネル取得
      const channel = member.guild.channels.cache.get(CHANNEL_ID);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle('メンバー参加')
          .setDescription(`${member.user.tag} がサーバーに参加しました。`)
          .setColor('Green')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: '/認証 で認証が可能です！' })
          .setTimestamp();

        channel.send({ embeds: [embed] }).catch(console.error);
      }

      // ブラックリストチェック
      try {
        const blacklistPath = path.join(__dirname, '../data/blacklist.json');
        const blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
        if (blacklist.includes(member.id)) {
          await member.kick('ブラックリスト登録ユーザー');
          console.log(`[キック] ブラックリスト一致: ${member.user.tag}`);
        }
      } catch (e) {
        console.error('ブラックリストチェック失敗:', e);
      }
    },
  },
  {
    name: 'guildMemberRemove',
    once: false,
    execute(member) {
      console.log(`[退会] ${member.user.tag} がサーバーから退出しました。`);

      // 通知チャンネル取得
      const channel = member.guild.channels.cache.get(CHANNEL_ID);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle('メンバー退会')
          .setDescription(`${member.user.tag} がサーバーを退出しました。`)
          .setColor('Red')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

        channel.send({ embeds: [embed] }).catch(console.error);
      }
    },
  },
];
