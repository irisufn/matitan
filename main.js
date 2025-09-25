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

//-------------------- コマンド登録 --------------------
require('./deploy-commands.js');

// コマンドを格納する Collection
client.commands = new Collection();

// コマンド読み込み関数
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    console.log(`-> [Loaded Command] ${file}`);
  }
}
loadCommands();

//-------------------- イベント読み込み --------------------
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    console.log(`-> [Loaded Event] ${file}`);
  }
}

// イベントファイルを読み込む（配列対応）
function loadEventArrays() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const eventModule = require(filePath);
    if (Array.isArray(eventModule)) {
      for (const event of eventModule) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`-> [Loaded Event] ${file} (${event.name})`);
      }
    }
  }
}

loadEvents();
loadEventArrays();

//-------------------- コマンド実行 --------------------
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction); // ← 修正: interactionのみ渡す
  } catch (error) {
    console.error(error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('コマンド実行中にエラーが発生しました');
      } else {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
      }
    } catch (e) {}
  }
});



//-------------------- !gm, !adm で動的に処理ファイルを呼び出す --------------------
client.on(Events.MessageCreate, async message => {
  // Bot自身やDMは無視
  if (message.author.bot || !message.guild) return;

  // !gmまたは!admコマンド専用
  let prefix = null;
  if (message.content.startsWith('!gm')) prefix = '!gm';
  if (message.content.startsWith('!adm')) prefix = '!adm';
  if (!prefix) return;

  // 引数を分割
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  if (args.length === 0) return;

  // normal/adminサブフォルダを参照
  let handlerPath;
  if (prefix === '!gm') {
    handlerPath = `./gm_handlers/normal/${args[0]}.js`;
  } else if (prefix === '!adm') {
    handlerPath = `./gm_handlers/admin/${args[0]}.js`;
  }
  try {
    const handler = require(handlerPath);
    await handler(client, message, args);
  } catch (error) {
    if (prefix === '!gm') {
      // !gmは何もせずスルー
      return;
    } else if (prefix === '!adm') {
      if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(handlerPath.replace('./', ''))) {
        await message.reply('管理者コマンドが無効です');
      } else {
        // それ以外のエラーはログ出力のみ
        console.error(error);
      }
    }
  }
});

//-------------------- Botログイン --------------------
client.login(process.env.TOKEN);
