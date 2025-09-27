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

  // 引数チェック
  // args[0] = "アナウンス"
  // args[1] = カラーコード
  // args[2] = タイトル
  // args[3]以降 = 説明
  if (args.length < 4) {
    return message.reply('引数が不足しています。');
  }

  // 固定送信先チャンネルID
  const CHANNEL_ID = '1421497191758954526';
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

  const title = args[2];
  const description = args.slice(3).join(' ');

  // 表示名とアイコン
  const displayName = message.member?.nickname || message.author.username;
  const avatarURL = message.author.displayAvatarURL({ dynamic: true });

  // Embed作成
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setAuthor({ name: displayName, iconURL: avatarURL })
    .setTimestamp()
    .setColor(color);

  await targetChannel.send({ embeds: [embed] });
  await message.reply('アナウンスを送信しました。');
};
