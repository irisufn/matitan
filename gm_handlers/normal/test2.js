const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message, args) => {
  // 引数チェック
  const count = parseInt(args[1]);
  if (isNaN(count)) return message.reply('数字を指定してください。');

  // 編集対象のメッセージID（例として固定）
  const TARGET_MESSAGE_ID = '1422206235154845836';
  const TARGET_CHANNEL_ID = message.channel.id; // 同じチャンネルにある場合

  try {
    // チャンネル取得
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel) return message.reply('チャンネルが見つかりません。');

    // メッセージ取得
    const targetMessage = await channel.messages.fetch(TARGET_MESSAGE_ID);
    if (!targetMessage) return message.reply('メッセージが見つかりません。');

    // メッセージからJSONを抽出（コードブロック内を想定）
    const content = targetMessage.content;
    const jsonMatch = content.match(/```json\n([\s\S]*)\n```/);
    let data = [];
    if (jsonMatch && jsonMatch[1]) {
      try {
        data = JSON.parse(jsonMatch[1]);
      } catch (err) {
        return message.reply('メッセージ内のJSONが不正です。');
      }
    }

    // 新しいデータを追加
    data.push({
      userid: message.author.id,
      count: count,
      approved: false
    });

    // メッセージを編集
    await targetMessage.edit('```json\n' + JSON.stringify(data, null, 2) + '\n```');

    message.reply('データを追加しました。');
  } catch (err) {
    console.error(err);
    message.reply('エラーが発生しました。');
  }
};
