const { ChannelType } = require('discord.js');
const axios = require('axios');

module.exports = async (client, message, args) => {
    // args[0] に送信先チャンネルIDを指定する前提
    const channelId = args[0];
    if (!channelId) {
        return message.reply('1422204415036752013');
    }

    let channel;
    try {
        channel = await client.channels.fetch(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return message.reply('指定されたチャンネルが見つからないか、テキストチャンネルではありません。');
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

        await channel.send('```json\n' + JSON.stringify(regularNow, null, 2) + '\n```');
        message.reply(`指定チャンネル <#${channelId}> にレギュラーマッチ情報を送信しました。`);
    } catch (error) {
        console.error(error);
        message.reply('ステージ情報の取得中にエラーが発生しました。');
    }
};
