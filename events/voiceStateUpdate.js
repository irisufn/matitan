// events/voiceStateUpdate.js
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

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

            // === 入室 ===
            if (!oldChannelId && newChannelId) {
                const vc = newState.channel;
                const notifyChannelId = vcData[vc.name];
                if (!notifyChannelId) return;

                const description = `<@${userId}> さんが **${vc.name}** に参加しました。`;

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

                const description = `<@${userId}> さんが **${vc.name}** から退出しました。`;

                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(description)
                    .setTimestamp();

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
                    const leaveDescription = `<@${userId}> さんが **${oldVc.name}** から退出しました。`;

                    const embedLeave = new EmbedBuilder()
                        .setColor('Red')
                        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                        .setDescription(leaveDescription)
                        .setTimestamp();

                    const notifyChannel = oldState.guild.channels.cache.get(leaveNotifyId);
                    if (notifyChannel) await notifyChannel.send({ embeds: [embedLeave] });
                }

                // 入室通知
                if (joinNotifyId) {
                    const joinDescription = `<@${userId}> さんが **${newVc.name}** に参加しました。`;

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
