const { ChannelType } = require('discord.js');
const axios = require('axios');

module.exports = async (client, message, args) => {
    const channelId = '1422204415036752013'; // 固定チャンネルID
    let channel;

    try {
        channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return message.reply('送信先チャンネルが見つからないか、テキストチャンネルではありません。');
        }
    } catch (error) {
        console.error(error);
        return message.reply('チャンネルの取得中にエラーが発生しました。');
    }

    try {
        const response = await axios.get('https://spla3.yuu26.com/api/schedule', {
            headers: {
                'User-Agent': 'Ikabot/1.0(twitter@your_account) IkaGirl/2.0(https://example.com/)'
            }
        });

        if (response.status !== 200) {
            return message.reply('ステージ情報の取得に失敗しました。');
        }

        const data = response.data;
        const regularNow = data.regular ? data.regular[0] : null;

        if (!regularNow) {
            return message.reply('現在のレギュラーマッチ情報が見つかりません。');
        }

        // JSONを固定チャンネルに送信
        await channel.send('```json\n' + JSON.stringify(regularNow, null, 2) + '\n```');
        message.reply('レギュラーマッチ情報を送信しました。');

    } catch (error) {
        console.error(error);
        message.reply('ステージ情報の取得中にエラーが発生しました。');
    }
};
