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

  if (args.length < 3) {
    return message.reply('引数が不足しています。');
  }

  const CHANNEL_ID = '1394103316526661632'.trim(); // 送信先チャンネルID
  const targetChannel = client.channels.cache.get(CHANNEL_ID);
  if (!targetChannel) {
    return message.reply('送信先チャンネルが見つかりませんでした。');
  }

  // カラーコード
  const colorInput = args[1];
  let color = 0x00AE86;
  try {
    color = parseInt(colorInput.replace('#', ''), 16);
  } catch {
    return message.reply('カラーコードの形式が正しくありません。例: `#00AE86`');
  }

  const title = args[2];
  let description = args.slice(3).join(' ').replace(/\\n/g, '\n');

  // @everyone の検知
  let mentionEveryone = false;
  if (description.includes('@everyone')) {
    mentionEveryone = true;
    description = description.replace(/@everyone/g, '').trim();
  }

  const name = message.author.globalName || message.author.username;
  const avatarURL = message.author.displayAvatarURL({ dynamic: true });

  const announceEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: name, iconURL: avatarURL })
    .setTimestamp()
    .setColor(color);

  // @everyone メンション送信
  if (mentionEveryone) {
    await targetChannel.send('@everyone');
  }

  // Embed送信
  await targetChannel.send({ embeds: [announceEmbed] });

  // 完了通知Embed
  const doneEmbed = new EmbedBuilder()
    .setTitle('✅ アナウンス送信完了')
    .setDescription(`チャンネル <#${CHANNEL_ID}> にアナウンスを送信しました。`)
    .setColor(0x00ff00)
    .setTimestamp();

  await message.channel.send({ embeds: [doneEmbed] });
};
