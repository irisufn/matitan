const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'splatoon',
    once: true,
    async execute(client) {
        const channelId = '1422204415036752013'; // 送信したいチャンネルID
        const channel = await client.channels.fetch(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
            console.error('指定チャンネルが見つかりません。');
            return;
        }

        try {
            const response = await axios.get('https://spla3.yuu26.com/api/schedule', {
                headers: {
                    'User-Agent': 'Ikabot/1.0(twitter@your_account) IkaGirl/2.0(https://example.com/)'
                }
            });

            if (response.status !== 200) {
                console.error('ステージ情報の取得に失敗しました。');
                return;
            }

            const data = response.data;
            const regularNow = data.regular ? data.regular[0] : null;

            if (!regularNow) {
                console.error('現在のレギュラーマッチ情報が見つかりません。');
                return;
            }

            await channel.send('```json\n' + JSON.stringify(regularNow, null, 2) + '\n```');
            console.log('レギュラーマッチ情報を送信しました。');

        } catch (error) {
            console.error('ステージ情報の取得中にエラーが発生しました:', error);
        }
    }
};
