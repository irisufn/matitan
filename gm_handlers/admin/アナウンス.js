const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

module.exports = async (client, message, args) => {
  // 管理者リスト読み込み
  const adminPath = path.join(__dirname, '../../data/admin.json');
  let adminList = [];
  try {
    adminList = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
  } catch (e) {
    await message.reply('管理者リストの読み込みに失敗しました');
    return;
  }

  // 管理者チェック
  if (!adminList.includes(message.author.id)) {
    await message.reply('管理者権限がありません');
    return;
  }

  // 引数不足チェック
  // args[0] = "アナウンス"
  // args[1] = カラーコード
  // args[2]以降 = 本文
  if (args.length < 3) {
    return message.reply('使い方: `!adm アナウンス [カラーコード] [本文...]`');
  }

  // 固定送信先チャンネルID
  const CHANNEL_ID = '1421497191758954526'; // ←ここを固定したいチャンネルIDに置き換えてください
  const targetChannel = client.channels.cache.get(CHANNEL_ID);
  if (!targetChannel) {
    return message.reply('送信先チャンネルが見つかりませんでした。');
  }

  // カラーコード変換
  const colorInput = args[1];
  let color = 0x00AE86; // デフォルト色
  try {
    color = parseInt(colorInput.replace('#', ''), 16);
  } catch {
    return message.reply('カラーコードの形式が正しくありません。例: `#00AE86`');
  }

  // 本文
  const content = args.slice(2).join(' ');

  // Embed作成
  const embed = new EmbedBuilder()
    .setTitle('アナウンス')
    .setDescription(content)
    .setAuthor({
      name: 'まちたん',
      iconURL: client.user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp()
    .setColor(color);

  await targetChannel.send({ embeds: [embed] });
  await message.reply('アナウンスを送信しました。');
};
