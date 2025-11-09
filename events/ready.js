const { Events } = require('discord.js');
const { channelId, messageId } = require('../config.json'); // JSON管理用チャンネルとメッセージID
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log("----------参加サーバー----------");
        console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人`).join("\n"));
        console.log("------------------------------");

        try {
            const channel = await client.channels.fetch(channelId);
            const msg = await channel.messages.fetch(messageId);
            let data = JSON.parse(msg.content);

            const now = dayjs().tz("Asia/Tokyo");
            let modified = false;

            for (const user of data.users) {
                if (!user.infractions || user.infractions.length === 0) continue;

                // infractions内の最新date + durationを取得
                const latestExpiry = user.infractions
                    .map(i => dayjs(i.date).tz("Asia/Tokyo").add(i.duration || 0, 'minute'))
                    .sort((a, b) => b - a)[0];

                if (latestExpiry.isBefore(now)) {
                    user.infractions = [];
                    user.count = 0;
                    modified = true;
                    console.log(`期間切れ: ${user.name} のinfractionsを削除`);
                }
            }

            if (modified) {
                await msg.edit(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
                console.log("期限切れデータを更新しました");
            } else {
                console.log("期限切れデータはありませんでした");
            }
        } catch (err) {
            console.error("起動時の期間チェックでエラー:", err);
        }
    },
};
