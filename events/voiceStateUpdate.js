// events/voiceStateUpdate.js
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

const SPECIAL_USER_IDS = ['1195248456839737374', '1423201364984594512'];
const SPECIAL_IMAGE_URL = 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/others/gureoji.png';

// 直近処理済みイベントキャッシュ（重複防止）
const processedUsers = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            // BOTは無視
            if (newState.member.user.bot) return;

            const user = newState.member.user;
            const userId = user.id;

            // 重複防止（2秒以内の同一ユーザー処理はスキップ）
            const now = Date.now();
            if (processedUsers.has(userId) && now - processedUsers.get(userId) < 2000) return;
            processedUsers.set(userId, now);

            const filePath = path.join(process.cwd(), 'data', 'vcchannels.json');
            if (!fs.existsSync(filePath)) return;
            const vcData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const oldChannelId = oldState.channelId;
            const newChannelId = newState.channelId;
            const isSpecialUser = SPECIAL_USER_IDS.includes(userId);

            // === 入室 ===
            if (!oldChannelId && newChannelId) {
                const vc = newState.channel;
                const notifyChannelId = vcData[vc.name];
                if (!notifyChannelId) return;

                let description = `<@${userId}> さんが **${vc.name}** に参加しました。`;

                if (isSpecialUser) {
                    const joinMessages = [
                        `<@${userId}> チャンが **${vc.name}** に参加したヨ😘`,
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

                let description = `<@${userId}> さんが **${vc.name}** から退出しました。`;
                let image = null;

                if (isSpecialUser) {
                    const leaveMessages = [
                        `😭💦 <@${userId}> チャンが ${vc.name} からいなくなっちゃった...😢`,
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
                    let leaveDescription = `<@${userId}> さんが **${oldVc.name}** から退出しました。`;
                    let leaveImage = null;

                    if (isSpecialUser) {
                        const leaveMessages = [
                            `😭💦 <@${userId}> チャンが ${vc.name} からいなくなっちゃった...😢`
                        ];
                        leaveDescription = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
                        leaveImage = SPECIAL_IMAGE_URL;
                    }

                    const embedLeave = new EmbedBuilder()
                        .setColor('Red')
                        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(leaveDescription)
                        .setTimestamp();

                    if (leaveImage) embedLeave.setImage(leaveImage);

                    const notifyChannel = oldState.guild.channels.cache.get(leaveNotifyId);
                    if (notifyChannel) await notifyChannel.send({ embeds: [embedLeave] });
                }

                // 入室通知
                if (joinNotifyId) {
                    let joinDescription = `<@${userId}> さんが **${newVc.name}** に参加しました。`;

                    if (isSpecialUser) {
                        const joinMessages = [
                            `<@${userId}> チャンが **${vc.name}** に参加したヨ😘`
                        ];
                        joinDescription = joinMessages[Math.floor(Math.random() * joinMessages.length)];
                    }

                    const embedJoin = new EmbedBuilder()
                        .setColor('Green')
                        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(joinDescription)
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
