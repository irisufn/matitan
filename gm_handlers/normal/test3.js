const { ChannelType } = require('discord.js');
const axios = require('axios');

module.exports = async (client, message, args) => {
    const channelId = '1422204415036752013';
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

        // JSON全体をそのまま送信
        await channel.send('```json\n' + JSON.stringify(response.data, null, 2) + '\n```');
        message.reply('ステージ情報を送信しました。');

    } catch (error) {
        console.error(error);
        message.reply('ステージ情報の取得中にエラーが発生しました。');
    }
};
