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
  // args[1] = チャンネルID
  // args[2] = カラーコード
  // args[3]以降 = 本文
  if (args.length < 4) {
    return message.reply('使い方: `!adm アナウンス [チャンネルID] [カラーコード] [本文...]`');
  }

  const channelId = args[1];
  const colorInput = args[2];
  const content = args.slice(3).join(' ');

  // チャンネル取得
  const targetChannel = client.channels.cache.get(channelId);
  if (!targetChannel) {
    return message.reply('指定されたチャンネルが見つかりません。');
  }

  // カラーコード変換
  let color = 0x00AE86; // デフォルト色
  try {
    color = parseInt(colorInput.replace('#', ''), 16);
  } catch {
    return message.reply('カラーコードの形式が正しくありません。例: `#00AE86`');
  }

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
