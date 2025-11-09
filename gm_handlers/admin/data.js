module.exports = async (client, message, args) => {
  // JSON管理チャンネルID
  const DATA_CHANNEL_ID = '1422204415036752013';

  try {
    // チャンネル取得
    const channel = await client.channels.fetch(DATA_CHANNEL_ID);
    if (!channel) {
      await message.reply('❌ 指定のチャンネルが見つかりません。');
      return;
    }

    // 初期JSONデータ作成
    const initData = { users: [] };

    // メッセージ送信
    const sentMsg = await channel.send(`\`\`\`json\n${JSON.stringify(initData, null, 2)}\n\`\`\``);

    await message.reply(`✅ 初期JSONメッセージを作成しました。メッセージID: ${sentMsg.id}`);
  } catch (err) {
    console.error(err);
    await message.reply('❌ JSONメッセージの作成に失敗しました。');
  }
};
