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

            // vcchannels.json を読み込む
            const filePath = path.join(__dirname, '../../data/vcchannels.json');
            if (!fs.existsSync(filePath)) {
                console.error(`[VC通知] vcchannels.json が存在しません: ${filePath}`);
                return;
            }

            const vcData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            // 入室
            if (!oldChannel && newChannel) {
                const notifyChannelId = vcData[newChannel.name];
                if (!notifyChannelId) {
                    console.error(`[VC通知] vcchannels.json に ${newChannel.name} の設定が見つかりません`);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setDescription(`<@${newState.id}> さんが **${newChannel.name}** に入室しました。`)
                    .setTimestamp();

                const notifyChannel = newState.guild.channels.cache.get(notifyChannelId);
                if (notifyChannel) {
                    await notifyChannel.send({ embeds: [embed] });
                }
            }

            // 退室
            else if (oldChannel && !newChannel) {
                const notifyChannelId = vcData[oldChannel.name];
                if (!notifyChannelId) {
                    console.error(`[VC通知] vcchannels.json に ${oldChannel.name} の設定が見つかりません`);
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setDescription(`<@${oldState.id}> さんが **${oldChannel.name}** から退室しました。`)
                    .setTimestamp();

                const notifyChannel = oldState.guild.channels.cache.get(notifyChannelId);
                if (notifyChannel) {
                    await notifyChannel.send({ embeds: [embed] });
                }
            }

            // 移動
            else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
                // 退室側
                const leaveNotifyId = vcData[oldChannel.name];
                if (!leaveNotifyId) {
                    console.error(`[VC通知] vcchannels.json に ${oldChannel.name} の設定が見つかりません`);
                } else {
                    const embedLeave = new EmbedBuilder()
                        .setColor('Red')
                        .setDescription(`<@${oldState.id}> さんが **${oldChannel.name}** から退室しました。`)
                        .setTimestamp();

                    const notifyChannel = oldState.guild.channels.cache.get(leaveNotifyId);
                    if (notifyChannel) {
                        await notifyChannel.send({ embeds: [embedLeave] });
                    }
                }

                // 入室側
                const joinNotifyId = vcData[newChannel.name];
                if (!joinNotifyId) {
                    console.error(`[VC通知] vcchannels.json に ${newChannel.name} の設定が見つかりません`);
                } else {
                    const embedJoin = new EmbedBuilder()
                        .setColor('Green')
                        .setDescription(`<@${newState.id}> さんが **${newChannel.name}** に入室しました。`)
                        .setTimestamp();

                    const notifyChannel = newState.guild.channels.cache.get(joinNotifyId);
                    if (notifyChannel) {
                        await notifyChannel.send({ embeds: [embedJoin] });
                    }
                }
            }
        } catch (err) {
            console.error('[VC通知] voiceStateUpdate 実行中にエラー:', err);
        }
    },
};
