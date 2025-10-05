// events/voiceStateUpdate.js
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const SPECIAL_USER_ID = ['1195248456839737374', '1423201364984594512']; // ←ここを指定ユーザーIDに変更
const SPECIAL_IMAGE_URL = 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/others/gureoji.png'; // ←退出時の画像URL

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            if (newState.member.user.bot) return;

            const filePath = path.join(process.cwd(), 'data', 'vcchannels.json');
            if (!fs.existsSync(filePath)) return;
            const vcData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const oldChannelId = oldState.channelId;
            const newChannelId = newState.channelId;
            const member = newState.member;
            const user = member.user;

            // === 入室 ===
            if (!oldChannelId && newChannelId) {
                const vc = newState.channel;
                const notifyChannelId = vcData[vc.name];
                if (!notifyChannelId) return;

                let description = `<@${user.id}> さんが **${vc.name}** に参加しました。`;

                // 特定ユーザーならランダムメッセージ
                if (user.id === SPECIAL_USER_ID) {
                    const joinMessages = [
                        `<@${user.id}> チャンが **${vc.name}** に参加したヨ😘`,
                        `<@${user.id}> チャン❗ ${vc.name} に来てくれたんだネッ😘💕 待ってたヨ〜😊 疲れてないカナ❓ ゆっくり楽しんでネ🎵`,
                        `<@${user.id}> チャン、${vc.name} で何してるの❓ 二人きりで話したいナァ💓（笑） ナンチャッテ😅 今度、美味しい☕でも奢ってあげるヨ👍 お楽しみに✨`
                    ];
                    description = joinMessages[Math.floor(Math.random() * joinMessages.length)];
                }

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(description)
                    .setTimestamp();

                const notifyChannel = newState.guild.channels.cache.get(notifyChannelId);
                if (notifyChannel) await notifyChannel.send({ embeds: [embed] });
            }

            // === 退室 ===
            else if (oldChannelId && !newChannelId) {
                const vc = oldState.channel;
                const notifyChannelId = vcData[vc.name];
                if (!notifyChannelId) return;

                let description = `<@${user.id}> さんが **${vc.name}** から退出しました。`;

                // 特定ユーザーならランダムメッセージ＋画像
                let image = null;
                if (user.id === SPECIAL_USER_ID) {
                    const leaveMessages = [
                        `😭💦 <@${user.id}> チャンが ${vc.name} からいなくなっちゃった...😢 おじさん🤓、寂しくて、死んじゃうヨ😂😂 またすぐに、来てくれるカナ❓ 待ってるネ😉`,
                        `<@${user.id}> ﾁｬﾝが ${vc.name} から消えちゃった...🥺 ボク、さみしくて、涙が止まらないよ😭😭 ナンチャッテ💦 またお顔を見せてネ😘`
                    ];
                    description = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
                    image = SPECIAL_IMAGE_URL;
                }

                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(description)
                    .setTimestamp();

                if (image) embed.setImage(image);

                const notifyChannel = oldState.guild.channels.cache.get(notifyChannelId);
                if (notifyChannel) await notifyChannel.send({ embeds: [embed] });
            }

            // === 移動 ===
            else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
                const oldVc = oldState.channel;
                const newVc = newState.channel;
                const leaveNotifyId = vcData[oldVc.name];
                const joinNotifyId = vcData[newVc.name];

                // 退室通知
                if (leaveNotifyId) {
                    const embedLeave = new EmbedBuilder()
                        .setColor('Red')
                        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`<@${user.id}> さんが **${oldVc.name}** から退出しました。`)
                        .setTimestamp();
                    const notifyChannel = oldState.guild.channels.cache.get(leaveNotifyId);
                    if (notifyChannel) await notifyChannel.send({ embeds: [embedLeave] });
                }

                // 入室通知
                if (joinNotifyId) {
                    const embedJoin = new EmbedBuilder()
                        .setColor('Green')
                        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`<@${user.id}> さんが **${newVc.name}** に参加しました。`)
                        .setTimestamp();
                    const notifyChannel = newState.guild.channels.cache.get(joinNotifyId);
                    if (notifyChannel) await notifyChannel.send({ embeds: [embedJoin] });
                }
            }
        } catch (err) {
            console.error('[VC通知] voiceStateUpdate 実行中にエラー:', err);
        }
    },
};
