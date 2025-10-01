const { EmbedBuilder } = require('discord.js');

// === 設定 ===
const JSON_CHANNEL_ID = "1421706737886564362";   // 承認対象JSONのチャンネル
const JSON_MESSAGE_ID = "1422913434210533407";   // 承認対象JSONのメッセージ
const INVITE_CHANNEL_ID = "1405896232647266384"; // 招待リンク作成チャンネル

module.exports = async (client, message, args) => {
  if (!args[1]) return message.reply('番号を指定してください。');
  const codeToApprove = args[1];

  try {
    // JSON取得
    const jsonChannel = await client.channels.fetch(JSON_CHANNEL_ID);
    const msg = await jsonChannel.messages.fetch(JSON_MESSAGE_ID);
    let json = JSON.parse(msg.content.replace(/^```json\s*/, '').replace(/\s*```$/, ''));

    if (!json[codeToApprove]) return message.reply('指定された番号は存在しません。');

    const userId = json[codeToApprove][0]; // [ユーザーID, 日時]
    const user = await client.users.fetch(userId);
    const inviteChannel = await client.channels.fetch(INVITE_CHANNEL_ID);

    // 招待リンク作成
    const invite = await inviteChannel.createInvite({
      maxAge: 0,   // 無期限
      maxUses: 1,  // 1回のみ
      unique: true
    });

    // DM送信
    try {
      await user.send(`申請が承認されました。\nhttps://discord.gg/${invite.code}`);
    } catch (err) {
      console.warn(`DM送信失敗: ${err}`);
      const embed = new EmbedBuilder()
        .setTitle('DM送信に失敗しました ⚠️')
        .setColor('Red')
        .setDescription('相手がDMを受け取る設定になっていない可能性があります。');
      return message.reply({ embeds: [embed] });
    }

    // JSONから該当番号を削除して編集
    delete json[codeToApprove];
    await msg.edit("```json\n" + JSON.stringify(json, null, 2) + "\n```");

    await message.reply(`番号 ${codeToApprove} の承認処理が完了しました。`);

  } catch (error) {
    console.error(error);
    await message.reply('エラーが発生しました。');
  }
};
