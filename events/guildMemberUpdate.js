const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember) {
    try {
      // タイムアウトの開始・終了を比較
      const beforeTimeout = oldMember.communicationDisabledUntilTimestamp;
      const afterTimeout = newMember.communicationDisabledUntilTimestamp;

      // タイムアウトが新たに設定された場合のみ
      if (!beforeTimeout && afterTimeout) {
        const TARGET_EXECUTOR_ID = "1102749583169294357"; // タイムアウト実行者ID

        // Audit Logから直近のタイムアウト実行者を取得
        const fetchedLogs = await newMember.guild.fetchAuditLogs({
          limit: 1,
          type: 24, // MEMBER_UPDATE
        });
        const log = fetchedLogs.entries.first();
        if (!log) return;

        const executor = log.executor;
        const target = log.target;

        if (executor.id === TARGET_EXECUTOR_ID) {
          // タイムアウトしたユーザーを1秒後に解除
          setTimeout(async () => {
            try {
              await newMember.timeout(null);
              console.log(`[Timeout Removed] ${target.tag} のタイムアウトを解除しました.`);

              // タイムアウト対象ユーザーがVCに参加している場合
              const vcChannel = newMember.voice.channel;
              if (vcChannel) {
                // JSONを直接組み込む
                const vcChannels = {
                  "スプラ1": "1394123562356572340",
                  "スプラ2": "1395251849724039219",
                  "スプラ3": "1395789776547876904",
                  "スプラ4": "1395789691915075594",
                  "スプラ5": "1406252066984165396",
                  "スプラ6": "1411693154935111752",
                  "スプラ7": "1411693229807636600",
                  "スプラ8": "1411693283268231188",
                  "スプラ9": "1411693337651581070",
                  "スプラ10": "1411693393087565875",
                  "雑談": "1395012543076110426",
                  "雑談(すくなめ)": "1395790246762778664",
                  "配信雑談": "1415992308767133727",
                  "寝落ちもちもち": "1413253453278609428"
                };

                const matchedChannelId = vcChannels[vcChannel.name];
                if (matchedChannelId) {
                  // チャンネル取得（キャッシュになくてもfetch）
                  const channel = await newMember.guild.channels.fetch(matchedChannelId);
                  if (channel && channel.isTextBased()) {
                    const GIF_URL = "https://c.tenor.com/yhFq6N5tvUEAAAAC/tenor.gif";
                    await channel.send({ content: GIF_URL });
                    console.log(`GIF送信完了: ${vcChannel.name} -> ${matchedChannelId}`);
                  }
                }
              }
            } catch (err) {
              console.error("タイムアウト解除またはGIF送信エラー:", err);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("guildMemberUpdateイベント処理エラー:", error);
    }
  },
};
