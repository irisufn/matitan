const { Events } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember) {
    try {
      // タイムアウトの開始・終了を比較
      const beforeTimeout = oldMember.communicationDisabledUntilTimestamp;
      const afterTimeout = newMember.communicationDisabledUntilTimestamp;

      // タイムアウトが新たに設定された場合のみ処理
      if (!beforeTimeout && afterTimeout) {
        const TARGET_EXECUTOR_ID = "1102749583169294357"; // タイムアウトを実行するユーザーID

        // Audit Logから直近のタイムアウト実行者を取得
        const fetchedLogs = await newMember.guild.fetchAuditLogs({
          limit: 1,
          type: 24, // MEMBER_UPDATE（タイムアウト含む）
        });

        const log = fetchedLogs.entries.first();
        if (!log) return;

        const executor = log.executor;
        const target = log.target;

        // タイムアウト実行者が指定IDかチェック
        if (executor.id === TARGET_EXECUTOR_ID) {
          // ここで、タイムアウトを実行したユーザーが VC に参加しているか確認
          const executorVoiceChannel = executor.presence?.member?.voice?.channel || 
                                       newMember.guild.members.cache.get(executor.id)?.voice?.channel;

          if (!executorVoiceChannel) return; // VC に参加していなければ処理終了

          console.log(`[Timeout Detected] ${executor.tag} が ${target.tag} をタイムアウトしました。`);

          // タイムアウト対象ユーザーを 1秒後に解除
          setTimeout(async () => {
            try {
              await newMember.timeout(null);
              console.log(`[Timeout Removed] ${target.tag} のタイムアウトを解除しました.`);

              // タイムアウト対象ユーザーが VC に参加している場合に処理
              const targetVoiceChannel = newMember.voice.channel;
              if (targetVoiceChannel) {
                // vcchannels.json を読み込む
                const filePath = path.join(__dirname, "../data/vcchannels.json");
                if (fs.existsSync(filePath)) {
                  const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

                  const matchedEntry = Object.entries(jsonData).find(
                    ([name]) => name === targetVoiceChannel.name
                  );

                  if (matchedEntry) {
                    const [, channelId] = matchedEntry;
                    const channel = newMember.guild.channels.cache.get(channelId);
                    if (channel && channel.isTextBased()) {
                      const GIF_URL = "https://c.tenor.com/yhFq6N5tvUEAAAAC/tenor.gif";
                      channel.send({ content: GIF_URL });
                      console.log(`GIF送信完了: ${targetVoiceChannel.name} -> ${channelId}`);
                    }
                  }
                }
              }
            } catch (err) {
              console.error("タイムアウト解除エラー:", err);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("guildMemberUpdateイベント処理エラー:", error);
    }
  },
};
