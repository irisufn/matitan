const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// === 設定（IDを適宜置き換えてください） ===
const APPROVAL_CHECK_CHANNEL_ID = "1422876009195114516"; // 最新メッセージで許可/不許可判定
const DENIED_JSON_CHANNEL_ID = "1421706737886564362"; // 不許可JSONを保存しているチャンネルID
const DENIED_JSON_MESSAGE_ID = "1422869974375993364"; // 不許可JSONを保存しているメッセージID
const APPROVED_JSON_CHANNEL_ID = "1422873409024557056"; // 許可JSONを保存しているチャンネルID
const APPROVED_JSON_MESSAGE_ID = "1422876260069146648"; // 許可JSONを保存しているメッセージID

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

      // 現在時刻（日本時間）
      const now = new Date();
      const japanTime = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

      // 6桁ランダム生成関数（重複なし、123456は不可）
      const generateCode = (existingCodes) => {
        let code;
        do {
          code = Math.floor(100000 + Math.random() * 900000).toString();
        } while (existingCodes[code] || code === "123456");
        return code;
      };

      // JSON取得用関数
      const fetchJsonMessage = async (channelId, messageId) => {
        const ch = await interaction.client.channels.fetch(channelId);
        const msg = await ch.messages.fetch(messageId);
        try {
          return JSON.parse(msg.content);
        } catch (e) {
          return {};
        }
      };

      if (content.includes("不許可")) {
        // 不許可の場合 → 不許可JSONに追加
        const deniedJson = await fetchJsonMessage(DENIED_JSON_CHANNEL_ID, DENIED_JSON_MESSAGE_ID);
        const code = generateCode(deniedJson);

        deniedJson[code] = {
          userid: userId,
          count: count
        };

        const deniedChannel = await interaction.client.channels.fetch(DENIED_JSON_CHANNEL_ID);
        const deniedMsg = await deniedChannel.messages.fetch(DENIED_JSON_MESSAGE_ID);
        await deniedMsg.edit("```json\n" + JSON.stringify(deniedJson, null, 2) + "\n```");

      } else if (content.includes("許可")) {
        // 許可の場合 → 使用回数分の招待コード生成してJSONに追加 & DM送信
        const approvedJson = await fetchJsonMessage(APPROVED_JSON_CHANNEL_ID, APPROVED_JSON_MESSAGE_ID);
        const approvedChannel = await interaction.client.channels.fetch(APPROVED_JSON_CHANNEL_ID);
        const approvedMsg = await approvedChannel.messages.fetch(APPROVED_JSON_MESSAGE_ID);

        for (let i = 0; i < count; i++) {
          const code = generateCode(approvedJson);
          approvedJson[code] = [userId, japanTime];

          // DM送信
          try {
            await interaction.user.send(`申請が許可されました。\nhttps://discord.gg/${code}`);
          } catch (err) {
            console.warn(`DM送信失敗: ${err}`);
          }
        }

        await approvedMsg.edit("```json\n" + JSON.stringify(approvedJson, null, 2) + "\n```");
      }

      // Embedで申請完了通知
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
