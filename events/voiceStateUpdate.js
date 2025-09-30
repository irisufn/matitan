// events/voiceStateUpdate.js
const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            // BOTは通知しない
            if (newState.member.user.bot) return;

            // vcchannels.json のパス取得（環境依存対策）
            const filePath = path.join(process.cwd(), 'data', 'vcchannels.json');
            if (!fs.existsSync(filePath)) {
                return;
            }
            const vcData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const oldChannelId = oldState.channelId;
            const newChannelId = newState.channelId;
            const member = newState.member;
            const user = member.user;

            // 入室
            if (!oldChannelId && newChannelId) {
                const vc = newState.channel;
                const notifyChannelId = vcData[vc.name];
                if (!notifyChannelId) return;
                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`<@${user.id}> さんが **${vc.name}** に参加しました。`)
                    .setTimestamp();
                const notifyChannel = newState.guild.channels.cache.get(notifyChannelId);
                if (notifyChannel) await notifyChannel.send({ embeds: [embed] });
            }
            // 退室
            else if (oldChannelId && !newChannelId) {
                const vc = oldState.channel;
                const notifyChannelId = vcData[vc.name];
                if (!notifyChannelId) return;
                const embed = new EmbedBuilder()
                    .setColor('Red')
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`<@${user.id}> さんが **${vc.name}** から退出しました。`)
                    .setTimestamp();
                const notifyChannel = oldState.guild.channels.cache.get(notifyChannelId);
                if (notifyChannel) await notifyChannel.send({ embeds: [embed] });
            }
            // 移動
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
