const { EmbedBuilder } = require('discord.js');

const TARGET_CHANNEL_ID = '1420404689991762060'; // 募集専用チャンネルID
const HAND_EMOJI = '✋';
const BOT_ID = '1419487057197269157'; // BOTのID

module.exports = (client) => {
  // リアクション追加時
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.message.channel.id !== TARGET_CHANNEL_ID) return;
    if (reaction.emoji.name !== HAND_EMOJI) return;

    const message = await reaction.message.fetch().catch(() => null);
    if (!message || message.author.id !== BOT_ID) return;

    const embed = message.embeds[0];
    if (!embed) return;

    // 募集人数を抽出（例: "@3" → 3）
    const peopleField = embed.fields.find(f => f.name === '人数');
    if (!peopleField) return;
    const match = peopleField.value.trim().match(/@?(\d+)/);
    const maxPeople = match ? parseInt(match[1], 10) : null;
    if (!maxPeople) return;

    // 現在のリアクション数を取得（BOT自身は除外）
    const reactionObj = reaction.message.reactions.cache.get(HAND_EMOJI);
    const users = await reactionObj.users.fetch();
    const joinedUsers = users.filter(u => !u.bot);
    const count = joinedUsers.size;

    if (count === maxPeople) {
      // 募集人数に達した → 色を黄色に変更して〆メッセージ
      const newEmbed = EmbedBuilder.from(embed).setColor('#ffff00'); // 黄色
      await message.edit({ embeds: [newEmbed] });

      const mentions = joinedUsers.map(u => `<@${u.id}>`).join(' ');
      await message.reply({ content: `〆\n${mentions}` });
      await message.channel.send({ content: `〆\n${mentions}` });

    } else if (count < maxPeople) {
      // 定員に達していない → 残り人数通知
      const remaining = maxPeople - count;
      await message.reply({ content: `残り募集人数: @${remaining}` });
      await message.channel.send({ content: `残り募集人数: @${remaining}` });

    } else if (count > maxPeople) {
      // 定員オーバーなら、押したリアクションを削除
      await reactionObj.users.remove(user.id);
    }
  });

  // リアクション削除時（参加取り消し）
  client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.message.channel.id !== TARGET_CHANNEL_ID) return;
    if (reaction.emoji.name !== HAND_EMOJI) return;

    const message = await reaction.message.fetch().catch(() => null);
    if (!message || message.author.id !== BOT_ID) return;

    const embed = message.embeds[0];
    if (!embed) return;

    const peopleField = embed.fields.find(f => f.name === '人数');
    if (!peopleField) return;
    const match = peopleField.value.trim().match(/@?(\d+)/);
    const maxPeople = match ? parseInt(match[1], 10) : null;
    if (!maxPeople) return;

    const reactionObj = reaction.message.reactions.cache.get(HAND_EMOJI);
    const users = await reactionObj.users.fetch();
    const joinedUsers = users.filter(u => !u.bot);
    const count = joinedUsers.size;

    if (count < maxPeople) {
      // 募集人数に満たなくなった → 水色に戻す
      const newEmbed = EmbedBuilder.from(embed).setColor('#00bfff');
      await message.edit({ embeds: [newEmbed] });

      const remaining = maxPeople - count;
      await message.reply({ content: `参加が取り消されました。\n残り募集人数: @${remaining}` });
      await message.channel.send({ content: `参加が取り消されました。\n残り募集人数: @${remaining}` });
    }
  });
};
