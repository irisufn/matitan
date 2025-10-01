const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// === 設定（IDを適宜置き換えてください） ===
const APPROVAL_CHECK_CHANNEL_ID = "1422876009195114516"; // 許可/不許可判定用チャンネル
const DENIED_JSON_CHANNEL_ID = "1421706737886564362";    // 不許可JSON格納チャンネル
const DENIED_JSON_MESSAGE_ID = "1422883649032028254";    // 不許可JSON格納メッセージ
const APPROVED_JSON_CHANNEL_ID = "1422873409024557056";  // 許可JSON格納チャンネル
const APPROVED_JSON_MESSAGE_ID = "1422879382124494920";  // 許可JSON格納メッセージ

module.exports = {
  data: new SlashCommandBuilder()
    .setName('招待申請')
    .setDescription('招待申請を行います')
    .addIntegerOption(option =>
      option.setName('使用回数')
        .setDescription('招待の使用回数を入力してください')
        .setRequired(true)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger('使用回数');
    const userId = interaction.user.id;

    try {
      // 判定用チャンネル取得
      const checkChannel = await interaction.client.channels.fetch(APPROVAL_CHECK_CHANNEL_ID);
      if (!checkChannel) return interaction.reply({ content: "判定用チャンネルが見つかりません。", ephemeral: true });

      // 最新メッセージ取得
      const messages = await checkChannel.messages.fetch({ limit: 1 });
      const latestMessage = messages.first();
      if (!latestMessage) return interaction.reply({ content: "最新メッセージが取得できません。", ephemeral: true });

      const content = latestMessage.content;

      // 日本時間
      const now = new Date();
      const japanTime = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

      // 6桁ランダム生成（123456除外、重複チェック用）
      const generateCode = (existingCodes) => {
        let code;
        do {
          code = Math.floor(100000 + Math.random() * 900000).toString();
        } while (existingCodes[code] || code === "123456");
        return code;
      };

      // JSON取得関数（コードブロック除去）
      const fetchJsonMessage = async (channel, messageId) => {
        const msg = await channel.messages.fetch(messageId);
        let text = msg.content;
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("JSON解析失敗:", e);
          return {};
        }
      };

      // JSONに新規追加＆編集
      const addToJsonMessage = async (channel, messageId, code, data) => {
        const json = await fetchJsonMessage(channel, messageId);
        json[code] = data; // 既存を保持して新規データ追加
        const msg = await channel.messages.fetch(messageId);
        await msg.edit("```json\n" + JSON.stringify(json, null, 2) + "\n```");
      };

      // 不許可の場合
      if (content.includes("不許可")) {
        const deniedChannel = await interaction.client.channels.fetch(DENIED_JSON_CHANNEL_ID);
        const deniedJson = await fetchJsonMessage(deniedChannel, DENIED_JSON_MESSAGE_ID);
        const code = generateCode(deniedJson);

        await addToJsonMessage(deniedChannel, DENIED_JSON_MESSAGE_ID, code, {
          userid: userId,
          count: count
        });

      } else if (content.includes("許可")) {
        // 許可の場合
        const approvedChannel = await interaction.client.channels.fetch(APPROVED_JSON_CHANNEL_ID);
        const approvedJson = await fetchJsonMessage(approvedChannel, APPROVED_JSON_MESSAGE_ID);

        for (let i = 0; i < count; i++) {
          const code = generateCode(approvedJson);

          await addToJsonMessage(approvedChannel, APPROVED_JSON_MESSAGE_ID, code, [
            userId,
            japanTime
          ]);

          // DM送信
          try {
            await interaction.user.send(`申請が許可されました。\nhttps://discord.gg/${code}`);
          } catch (err) {
            console.warn(`DM送信失敗: ${err}`);
          }
        }
      }

      // 申請完了通知Embed
      const embed = new EmbedBuilder()
        .setTitle("申請が完了しました ✅")
        .setColor("Green")
        .setFooter({ text: `申請キャンセル時は !gm キャンセル <6桁コード> を実行してください。` });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "エラーが発生しました。", ephemeral: true });
    }
  }
};
