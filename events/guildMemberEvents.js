// events/guildMemberEvents.js
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const CHANNEL_ID = '1420404689991762060'; // 通知用チャンネルID
const ROLE_ID = '1421125163797319720';    // ←付与したいロールIDを設定

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

      // 🔹 ロール付与
      try {
        const role = member.guild.roles.cache.get(ROLE_ID);
        if (role) {
          await member.roles.add(role);
          console.log(`[ロール付与] ${member.user.tag} に ${role.name} を付与しました。`);
        } else {
          console.warn(`[警告] ロールID ${ROLE_ID} が見つかりませんでした。`);
        }
      } catch (err) {
        console.error(`[エラー] ${member.user.tag} へのロール付与失敗:`, err);
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
];
