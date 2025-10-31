const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message, args) => {
  // 引数チェック
  if (args.length < 4) {
    return message.reply('使い方: `!gm send <メッセージ> <チャンネルID> <color(1〜3)>`');
  }

  // 引数の整理
  const text = args[1]; // メッセージ内容
  const channelId = args[2]; // チャンネルID
  const colorCode = args[3]; // カラー番号

  // カラー判定
  const colorMap = {
    1: 0xFF0000, // 赤
    2: 0x0000FF, // 青
    3: 0x00FF00  // 緑
  };

  const color = colorMap[colorCode] || 0xFFFFFF; // デフォルト白

  // チャンネル取得
  const targetChannel = client.channels.cache.get(channelId);
  if (!targetChannel) {
    return message.reply('指定されたチャンネルが見つかりません。');
  }

  // Embed作成
  const embed = new EmbedBuilder()
    .setTitle('📢 お知らせ')
    .setDescription(text)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `送信者: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

  // 送信
  try {
    await targetChannel.send({ embeds: [embed] });
    await message.reply('✅ メッセージを送信しました！');
  } catch (err) {
    console.error(err);
    await message.reply('❌ メッセージの送信に失敗しました。');
  }
};
