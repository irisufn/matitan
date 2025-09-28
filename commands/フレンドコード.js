const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// 必要なモジュールのインポート
const fs = require('fs');
const TOML = require('toml');
const path = require('path'); // ファイルパスの操作にpathモジュールを使用

// TOMLファイルのパスa
const CONFIG_PATH = path.join(__dirname, 'data', 'channels.toml');

// 設定を読み込む関数
function loadConfig() {
  try {
    const tomlString = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return TOML.parse(tomlString).channels; // [channels]セクションだけを返す
  } catch (error) {
    console.error(`設定ファイル ${CONFIG_PATH} の読み込みに失敗しました:`, error);
    // 致命的なエラーとして処理を中断するためにnullなどを返すか、
    // 例外を再スローします。ここではエラーを発生させます。
    throw new Error('チャンネル設定のロードに失敗しました。');
  }
}

// コマンドが実行される前に設定をロード
const CHANNEL_CONFIG = loadConfig();
const TARGET_CHANNEL_ID = CHANNEL_CONFIG.target_channel_id; 
const GUIDE_CHANNEL_ID = CHANNEL_CONFIG.guide_channel_id; 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('フレンドコード')
    .setDescription('フレンドコードを表示'),

  async execute(interaction) {
    // チャンネルIDは、上で定義した定数を使用します
    // const TARGET_CHANNEL_ID = '1395595186847092827'; // 削除
    // const GUIDE_CHANNEL_ID = '1421663161647497357'; // 削除

    try {
      const channel = interaction.client.channels.cache.get(TARGET_CHANNEL_ID);

      if (!channel) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('エラー')
              .setDescription('指定のチャンネルが見つかりません。設定を確認してください。') // エラーメッセージを少し変更
              .setColor(0xFF0000),
          ],
          ephemeral: true,
        });
      }

      // メッセージ取得
      const messages = await fetchUpTo1000Messages(channel);
      const userMessages = messages.filter(m => m.author.id === interaction.user.id);
      const userMessage = userMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];

      if (!userMessage) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('フレンドコードが見つかりませんでした')
              .setDescription(`あなたのフレンドコードが見つかりませんでした。\n<#${GUIDE_CHANNEL_ID}> にフレンドコードを投稿してください。`)
              .setColor(0xFF0000),
          ],
          ephemeral: true,
        });
      }

      // フレンドコード抽出
      // (中略 - この部分は変更なし)
      const match = userMessage.content.match(/(?:SW[-\s　,.]?)?(\d{4})[-\s\u3000,.]?(\d{4})[-\s\u3000,.]?(\d{4})/i);
      if (!match) {
        return await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('フレンドコードが見つかりませんでした')
              .setDescription(`フレンドコードが見つかりません。\n<#${GUIDE_CHANNEL_ID}> に投稿してください。`)
              .setColor(0xFF0000),
          ],
          ephemeral: true,
        });
      }

      const code = `SW-${match[1]}-${match[2]}-${match[3]}`;

      return await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('フレンドコード')
            .setDescription(code)
            .setFooter({ text: 'スマホの方はフレンドコード長押しでコピーできます。' })
            .setColor(0xFFFF00),
        ],
      });

    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'コマンド実行中にエラーが発生しました',
          ephemeral: true,
        });
      }
    }
  },
};

// 最大1000件まで遡ってメッセージを取得 (この関数は変更なし)
async function fetchUpTo1000Messages(channel) {
  let allMessages = [];
  let lastId;

  for (let i = 0; i < 10; i++) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    allMessages = allMessages.concat(Array.from(messages.values()));
    lastId = messages.last().id;

    if (allMessages.length >= 1000) break;
  }

  return allMessages;
}