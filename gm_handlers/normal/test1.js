module.exports = async (client, message, args) => {
  // 送信先チャンネルID。定数名はすべて大文字とアンダースコアで統一 (慣習)
  const CHANNEL_ID = '1422873409024557056'; 

  const userData = { 
    "AAAAAA": {
      "test1": "AAAAAAAA", 
      "test2": "AAAAAAAA", 
    },
  };

  // 1. チャンネルの取得をより安全に処理
  const channel = await client.channels.fetch(CHANNEL_ID)
    .catch(error => {
      console.error('チャンネル取得エラー:', error);
      return null;
    });

  if (!channel) {
    // エラーメッセージの送信
    return message.reply('⚠️ 指定されたチャンネルが見つからないか、アクセスできません。');
  }

  // 2. JSONを整形して送信（JSON.stringifyの第2引数に null、第3引数に 2 を指定）
  const jsonString = JSON.stringify(userData, null, 2);

  // 3. コードブロックと整形されたJSON文字列を結合して送信
  // バッククォート (`) を使用したテンプレートリテラルでより読みやすく
  channel.send(`\`\`\`json\n${jsonString}\n\`\`\``)
    .catch(error => {
      console.error('メッセージ送信エラー:', error);
      message.reply('JSONデータの送信に失敗しました。');
    });
};