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

  // 引数がない場合は処理しない
  if (args.length < 2) {
    return message.reply('アナウンス内容を入力してください。');
  }

  // args[0]はコマンド名（アナウンス）なので、それ以降を結合
  const content = args.slice(1).join(' ');

  const embed = new EmbedBuilder()
    .setTitle('アナウンス')
    .setDescription(content)
    .setAuthor({
      name: 'まちたん',
      iconURL: client.user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp()
    .setColor(0x00AE86);

  // 固定送信先チャンネルID（ここを設定してください）
  const CHANNEL_ID = '1421497191758954526'; 

  const targetChannel = client.channels.cache.get(CHANNEL_ID);
  if (!targetChannel) {
    return message.reply('送信先チャンネルが見つかりませんでした。');
  }

  await targetChannel.send({ embeds: [embed] });
  await message.reply('アナウンスを送信しました。');
};
