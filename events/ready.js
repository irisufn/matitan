const { Events } = require('discord.js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const DATA_CHANNEL_ID = '1422204415036752013';
const DATA_MESSAGE_ID = '1436925986594750496';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log("----------参加サーバー----------");
        console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人`).join("\n"));
        console.log("------------------------------");

        try {
            const channel = await client.channels.fetch(DATA_CHANNEL_ID);
            const msg = await channel.messages.fetch(DATA_MESSAGE_ID);

            // 🔹 修正: ```json ``` を除去してから JSON.parse
            const content = msg.content.replace(/```json|```/g, '').trim();
            let data = JSON.parse(content);

            const now = dayjs().tz("Asia/Tokyo");
            let modified = false;

            for (const user of data.users) {
                if (!user.infractions || user.infractions.length === 0) continue;

                // infractions内の最新date + durationを取得
                const latestExpiry = user.infractions
                    .map(i => dayjs(i.date).tz("Asia/Tokyo").add(i.duration || 0, 'day'))
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
