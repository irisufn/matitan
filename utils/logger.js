// 共通エラーログ送信ユーティリティ
const fs = require('node:fs');
const path = require('node:path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

/**
 * エラー内容をconsoleと指定チャンネルに送信
 * @param {Client} client Discord.jsのClient
 * @param {string|Error} error エラー内容
 */
async function logError(client, error) {
  console.error(error);
  const channelId = config.error_channel_id;
  if (!channelId) return;
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;
  let msg = typeof error === 'string' ? error : (error.stack || error.message || String(error));
  // Discordのメッセージ制限対策
  if (msg.length > 1900) msg = msg.slice(0, 1900) + '...';
  try {
    await channel.send(`【エラーログ】\n${msg}`);
  } catch (e) {
    console.error('エラーログ送信失敗:', e);
  }
}

module.exports = { logError };
