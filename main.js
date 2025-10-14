// main.js
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

//-------------------- Bot クライアント作成 --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

//-------------------- 起動時ログ --------------------
console.log("=== Discord Bot 起動開始 ===");
if (!process.env.TOKEN) {
  console.error("❌ TOKEN が設定されていません (.env or Render環境変数を確認してください)");
} else {
  console.log("✅ TOKEN検出:", process.env.TOKEN.slice(0, 10) + "...");
}

//-------------------- コマンド登録 --------------------
try {
  require('./deploy-commands.js');
  console.log("✅ deploy-commands.js を読み込みました");
} catch (err) {
  console.warn("⚠️ deploy-commands.js の読み込みに失敗:", err.message);
}

// コマンドコレクション
client.commands = new Collection();

//-------------------- コマンド読み込み --------------------
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) {
    console.warn("⚠️ commands フォルダが見つかりません");
    return;
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      client.commands.set(command.data.name, command);
      console.log(`-> [Loaded Command] ${file}`);
    } catch (err) {
      console.error(`❌ コマンド ${file} の読み込みに失敗:`, err.message);
    }
  }
}
loadCommands();

//-------------------- イベント読み込み --------------------
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsPath)) {
    console.warn("⚠️ events フォルダが見つかりません");
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (Array.isArray(event)) continue; // 配列は別関数で処理
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      console.log(`-> [Loaded Event] ${file}`);
    } catch (err) {
      console.error(`❌ イベント ${file} の読み込みに失敗:`, err.message);
    }
  }
}

// 複数イベント対応
function loadEventArrays() {
  const eventsPath = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsPath)) return;

  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const eventModule = require(filePath);
      if (!Array.isArray(eventModule)) continue;
      for (const event of eventModule) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`-> [Loaded Event] ${file} (${event.name})`);
      }
    } catch (err) {
      console.error(`❌ 複数イベント定義の ${file} の読み込みに失敗:`, err.message);
    }
  }
}
loadEvents();
loadEventArrays();

//-------------------- Interaction (スラッシュコマンド) --------------------
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ コマンド実行中エラー (${interaction.commandName}):`, error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('コマンド実行中にエラーが発生しました');
      } else {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
      }
    } catch {}
  }
});

//-------------------- !gm / !adm 動的処理 --------------------
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;
  let prefix = null;
  if (message.content.startsWith('!gm')) prefix = '!gm';
  if (message.content.startsWith('!adm')) prefix = '!adm';
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  if (args.length === 0) return;

  let handlerPath;
  if (prefix === '!gm') handlerPath = `./gm_handlers/normal/${args[0]}.js`;
  else if (prefix === '!adm') handlerPath = `./gm_handlers/admin/${args[0]}.js`;

  try {
    const handler = require(handlerPath);
    await handler(client, message, args);
  } catch (error) {
    if (prefix === '!adm') {
      if (error.code === 'MODULE_NOT_FOUND') {
        await message.reply('管理者コマンドが無効です');
      } else {
        console.error(error);
      }
    }
  }
});

//-------------------- Botログイン --------------------
client.login(process.env.TOKEN)
  .then(() => {
    console.log("✅ Discordへのログイン要求を送信しました...");
  })
  .catch(err => {
    console.error("❌ Discordへのログインに失敗しました:");
    console.error(err);
  });

//-------------------- Readyが来ない場合の警告 --------------------
setTimeout(() => {
  if (!client.user) {
    console.warn("⚠️ 注意: 10秒経過しても ready イベントが発火していません。TOKENの有効性・権限を確認してください。");
  }
}, 10000);
