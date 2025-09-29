// !gmコマンドのテキスト反応処理
module.exports = async (client, message, args) => {
  // 送信先チャンネルID
  const CHANNEL_ID = '1422204415036752013';

  // JSON形式のデータ
  const jsonData = [
    {
      "userid": "12345678",
      "count": 1,
      "approved": true
    }
  ];

  // チャンネル取得
  const channel = await client.channels.fetch(CHANNEL_ID).catch(console.error);
  if (!channel) return message.reply('指定されたチャンネルが見つかりません。');

  // JSONを文字列化して送信
  channel.send('```json\n' + JSON.stringify(jsonData, null, 2) + '\n```');
};
