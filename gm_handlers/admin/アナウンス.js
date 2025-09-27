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
  if (args.length < 3) {
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
  let color = 0x00AE86;
  try {
    color = parseInt(colorInput.replace('#', ''), 16);
  } catch {
    return message.reply('カラーコードの形式が正しくありません。例: `#00AE86`');
  }

  const title = args[2];
  const description = args.slice(3).join(' ');

  // 表示名とアイコン
  const name = message.author.globalName || message.author.username;
  const avatarURL = message.author.displayAvatarURL({ dynamic: true });

  // アナウンス用Embed
  const announceEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description) // ← \n で改行可能
    .setFooter({ text: `送信者: ${name}`, iconURL: avatarURL })
    .setTimestamp()
    .setColor(color);

  // コマンドメッセージ削除
  try {
    await message.delete();
  } catch (err) {
    console.error('元メッセージ削除に失敗:', err);
  }

  // 固定チャンネルへ送信
  await targetChannel.send({ embeds: [announceEmbed] });

  // 完了通知用Embed
  const doneEmbed = new EmbedBuilder()
    .setTitle('✅ アナウンス送信完了')
    .setDescription(`チャンネル <#${CHANNEL_ID}> にアナウンスを送信しました。`)
    .setColor(0x00ff00)
    .setTimestamp();

  // 元メッセージがあったチャンネルに通知
  await message.channel.send({ embeds: [doneEmbed] });
};
