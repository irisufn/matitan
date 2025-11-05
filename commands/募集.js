const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 募集を投稿するチャンネルID
const TARGET_CHANNEL_ID = '1420404689991762060';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('募集')
    .setDescription('募集を投稿します')
    // 必須オプションは先に
    .addIntegerOption(option =>
      option.setName('人数')
        .setDescription('募集人数（最大8人）')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(8))
    .addStringOption(option =>
      option.setName('日時')
        .setDescription('日時を入力してください')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('モード')
        .setDescription('プレイモードを選択してください')
        .setRequired(true)
        .addChoices(
          { name: 'ナワバリ', value: 'ナワバリ' },
          { name: 'バンカラ', value: 'バンカラ' },
          { name: 'プラベ', value: 'プラベ' },
          { name: 'Xマッチ', value: 'Xマッチ' },
          { name: 'バイト', value: 'バイト' },
          { name: 'フェス', value: 'フェス' },
          { name: 'イベントマッチ', value: 'イベントマッチ' },
          { name: 'その他', value: 'その他' },
        ))
    .addStringOption(option =>
      option.setName('everyone')
        .setDescription('@everyone を付けますか？')
        .setRequired(true)
        .addChoices(
          { name: 'あり', value: 'あり' },
          { name: 'なし', value: 'なし' },
        ))
    // 任意オプションは最後
    .addStringOption(option =>
      option.setName('説明')
        .setDescription('募集の説明（任意）')
        .setRequired(false)),

  async execute(interaction) {
    const channel = interaction.channel;
    const user = interaction.user;
    const people = interaction.options.getInteger('人数');
    const date = interaction.options.getString('日時');
    const mode = interaction.options.getString('モード');
    const description = interaction.options.getString('説明') || '（説明なし）';
    const everyone = interaction.options.getString('everyone');

    // チャンネル確認
    if (channel.id !== TARGET_CHANNEL_ID) {
      return interaction.reply({
        content: `❌ このコマンドは <#${TARGET_CHANNEL_ID}> でのみ使用できます。`,
        ephemeral: true
      });
    }

    // Embed作成
    const embed = new EmbedBuilder()
      .setColor('#00bfff') // 水色
      .setAuthor({ name: `${user.username} さんの募集`, iconURL: user.displayAvatarURL() })
      .setTitle(`${mode} の募集！`)
      .addFields(
        { name: '日時', value: date, inline: false },
        { name: '人数', value: `@${people}`, inline: false },
        { name: '説明', value: description, inline: false },
      )
      .setFooter({ text: `募集者: ${user.tag}` })
      .setTimestamp();

    // 投稿チャンネル確認
    const targetChannel = interaction.client.channels.cache.get(TARGET_CHANNEL_ID);
    if (!targetChannel) {
      return interaction.reply({
        content: '❌ 指定されたチャンネルが見つかりません。',
        ephemeral: true
      });
    }

    // @everyone と Embed を1つのメッセージで送信
    const content = everyone === 'あり' ? '@everyone' : null;

    const message = await targetChannel.send({
      content,
      embeds: [embed],
    });

    // ✋ リアクション追加
    await message.react('✋');

    // 成功メッセージ（ephemeral）
    await interaction.reply({
      content: '✅ 募集を投稿しました！',
      ephemeral: true
    });
  },
};
