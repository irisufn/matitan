const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// === 設定（IDを適宜置き換えてください） ===
const APPROVAL_CHECK_CHANNEL_ID = "1422876009195114516"; // 許可/不許可判定用チャンネル
const DENIED_JSON_CHANNEL_ID = "1421706737886564362";    // 不許可JSON格納チャンネル
const DENIED_JSON_MESSAGE_ID = "1422913434210533407";    // 不許可JSON格納メッセージ
const APPROVED_JSON_CHANNEL_ID = "1422873409024557056";  // 許可JSON格納チャンネル
const APPROVED_JSON_MESSAGE_ID = "1422913425138389083";  // 許可JSON格納メッセージ
const INVITE_CHANNEL_ID = "1405896232647266384";         // 招待リンク作成チャンネル

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
      // 判定用チャンネルの最新メッセージ取得
      const checkChannel = await interaction.client.channels.fetch(APPROVAL_CHECK_CHANNEL_ID);
      const messages = await checkChannel.messages.fetch({ limit: 1 });
      const latestMessage = messages.first();
      if (!latestMessage) return interaction.reply({ content: "最新メッセージが取得できません。", ephemeral: true });

      const content = latestMessage.content;
      const now = new Date();
      const japanTime = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

      // 既存JSON保持＋マージ用関数
      const fetchJsonMessage = async (channel, messageId) => {
        try {
          const msg = await channel.messages.fetch(messageId);
          let text = msg.content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          return JSON.parse(text);
        } catch {
          return {};
        }
      };

      const addToJsonMessage = async (channel, messageId, key, data) => {
        const json = await fetchJsonMessage(channel, messageId);
        json[key] = data;
        try {
          const msg = await channel.messages.fetch(messageId);
          await msg.edit("```json\n" + JSON.stringify(json, null, 2) + "\n```");
        } catch {
          await channel.send("```json\n" + JSON.stringify(json, null, 2) + "\n```");
        }
      };

      // 6桁ランダムコード生成（不許可用）
      const generateCode = (existingCodes) => {
        let code;
        do {
          code = Math.floor(100000 + Math.random() * 900000).toString();
        } while (existingCodes[code] || code === "123456");
        return code;
      };

      // JSON追加 + 招待作成（許可/不許可判定）
      if (content.includes("不許可")) {
        // 不許可 → 6桁ランダムコードでJSONに追加
        const deniedChannel = await interaction.client.channels.fetch(DENIED_JSON_CHANNEL_ID);
        const deniedJson = await fetchJsonMessage(deniedChannel, DENIED_JSON_MESSAGE_ID);
        const code = generateCode(deniedJson);

        await addToJsonMessage(deniedChannel, DENIED_JSON_MESSAGE_ID, code, {
          userid: userId,
          count: count
        });

      } else if (content.includes("許可")) {
        // 許可 → 招待作成 + JSON追加 + DM
        const approvedChannel = await interaction.client.channels.fetch(APPROVED_JSON_CHANNEL_ID);
        const inviteChannel = await interaction.client.channels.fetch(INVITE_CHANNEL_ID);

        for (let i = 0; i < count; i++) {
          // Discord招待リンク作成
          const invite = await inviteChannel.createInvite({
            maxAge: 0,
            maxUses: 1,
            unique: true
          });
          const inviteCode = invite.code;

          // JSONに追加
          await addToJsonMessage(approvedChannel, APPROVED_JSON_MESSAGE_ID, inviteCode, [
            userId,
            japanTime
          ]);

          // DM送信（ここは既にテスト済みなので失敗はほぼない）
          await interaction.user.send(`申請が承認されました。\nhttps://discord.gg/${inviteCode}`);
        }
      }

      // Embed通知（申請完了・許可の場合のみフッターなし）
      const embed = new EmbedBuilder()
        .setTitle("申請が完了しました ✅")
        .setColor("Green");
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: "エラーが発生しました。", ephemeral: true });
      }
    }
  }
};
