const { Events } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const TARGET_USER_ID = "1102749583169294357"; // 監視対象

      // VC参加時のみ
      if (!oldState.channel && newState.channel) {
        if (newState.member.id === TARGET_USER_ID) {
          const vcName = newState.channel.name;

          // vcchannels.jsonを読み込む
          const filePath = path.join(__dirname, "../data/vcchannels.json");
          if (!fs.existsSync(filePath)) return;

          const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

          // VC名と一致するものがあるかチェック
          const matchedEntry = Object.entries(jsonData).find(
            ([name]) => name === vcName
          );

          if (matchedEntry) {
            const [_, channelId] = matchedEntry;

            const channel = newState.guild.channels.cache.get(channelId);
            if (channel && channel.isTextBased()) {
              // GIF送信（URLはここに指定）
              const GIF_URL = "https://c.tenor.com/yhFq6N5tvUEAAAAC/tenor.gif";
              channel.send({ content: GIF_URL });
              console.log(`GIF送信完了: ${vcName} -> ${channelId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("voiceStateUpdateイベントエラー:", error);
    }
  },
};
