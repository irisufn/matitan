const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember) {
    try {
      // === タイムアウト検知 ===
      const beforeTimeout = oldMember.communicationDisabledUntilTimestamp;
      const afterTimeout = newMember.communicationDisabledUntilTimestamp;

      // タイムアウトが新たに設定されたときのみ反応
      if (!beforeTimeout && afterTimeout) {
        // 監視対象ユーザーID（タイムアウトを実行した人）
        const TARGET_USER_ID = "1102749583169294357"; // ←ここをあなたの指定IDに変更

        // Audit Logから直近のタイムアウト実行者を取得
        const fetchedLogs = await newMember.guild.fetchAuditLogs({
          limit: 1,
          type: 24, // MEMBER_UPDATE（タイムアウトも含む）
        });

        const log = fetchedLogs.entries.first();
        if (!log) return;

        const executor = log.executor;
        const target = log.target;

        // タイムアウトさせた人が指定IDかチェック
        if (executor.id === TARGET_USER_ID && target.id === newMember.id) {
          console.log(
            `[Timeout Detected] ${executor.tag} が ${target.tag} をタイムアウトしました。`
          );

          // 1秒後に解除
          setTimeout(async () => {
            try {
              await newMember.timeout(null);
              console.log(`[Timeout Removed] ${target.tag} のタイムアウトを解除しました。`);
            } catch (err) {
              console.error("解除エラー:", err);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("guildMemberUpdateイベント処理エラー:", error);
    }
  },
};
