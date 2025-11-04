const { EmbedBuilder } = require('discord.js');

const TARGET_CHANNEL_ID = '1399782981140353126'; // 募集専用チャンネルID
const HAND_EMOJI = '✋';
const BOT_ID = '1419487057197269157'; // ←忘れずに設定

module.exports = (client) => {
  // リアクション追加時
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.message.channel.id !== TARGET_CHANNEL_ID) return;
    if (reaction.emoji.name !== HAND_EMOJI) return;

    // メッセージ取得
    const message = await reaction.message.fetch().catch(() => null);
    if (!message || message.author.id !== BOT_ID) return; // BOTの募集メッセージであることを確認

    // Embed取得
    const embed = message.embeds[0];
    if (!embed) return;

    // 募集人数を抽出（例: "@3" → 3）
    const peopleMatch = embed.fields.find(f => f.name.includes('募集人数'));
    if (!peopleMatch) return;
    const match = peopleMatch.value.match(/@(\d+)/);
    const maxPeople = match ? parseInt(match[1], 10) : null;
    if (!maxPeople) return;

    // 現在のリアクション数を取得（BOT自身を除外）
    const reactionObj = reaction.message.reactions.cache.get(HAND_EMOJI);
    const users = await reactionObj.users.fetch();
    const joinedUsers = users.filter(u => !u.bot);
    const count = joinedUsers.size;

    // 状態確認
    if (count === maxPeople) {
      // 募集人数に達した → 色を黄色に変えて「〆」返信
      const newEmbed = EmbedBuilder.from(embed).setColor('#fff000');
      await message.edit({ embeds: [newEmbed] });

      // 参加者のメンション作成
      const mentions = joinedUsers.map(u => `<@${u.id}>`).join(' ');
      await message.reply({
        content: `〆\n${mentions}`,
      });
      await message.channel.send({
        content: `〆\n${mentions}`,
      });
    } else if (count < maxPeople) {
      // まだ定員に達していない → 残り人数を表示
      const remaining = maxPeople - count;
      await message.reply({
        content: `@${remaining}`,
      });
      await message.channel.send({
        content: `@${remaining}`,
      });
    } else if (count > maxPeople) {
      // すでに定員オーバーなら、今押したリアクションを削除
      const userReaction = reaction.message.reactions.cache.get(HAND_EMOJI);
      await userReaction.users.remove(user.id);
    }
  });

  // リアクション削除時（参加取り消し）
  client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.message.channel.id !== TARGET_CHANNEL_ID) return;
    if (reaction.emoji.name !== HAND_EMOJI) return;

    // メッセージ取得
    const message = await reaction.message.fetch().catch(() => null);
    if (!message || message.author.id !== BOT_ID) return;

    const embed = message.embeds[0];
    if (!embed) return;

    // 募集人数を抽出
    const peopleMatch = embed.fields.find(f => f.name.includes('募集人数'));
    if (!peopleMatch) return;
    const match = peopleMatch.value.match(/@(\d+)/);
    const maxPeople = match ? parseInt(match[1], 10) : null;
    if (!maxPeople) return;

    // 現在のリアクション数を取得（BOT自身を除外）
    const reactionObj = reaction.message.reactions.cache.get(HAND_EMOJI);
    const users = await reactionObj.users.fetch();
    const joinedUsers = users.filter(u => !u.bot);
    const count = joinedUsers.size;

    if (count < maxPeople) {
      // 募集人数に満たなくなった → 水色に戻す
      const newEmbed = EmbedBuilder.from(embed).setColor('#00bfff');
      await message.edit({ embeds: [newEmbed] });

      // 残り人数を通知
      const remaining = maxPeople - count;
      await message.reply({
        content: `参加が取り消されました。\n@${remaining}`,
      });
      await message.channel.send({
        content: `参加が取り消されました。\n@${remaining}`,
      });
    }
  });
};
