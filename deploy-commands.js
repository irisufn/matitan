require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { clientId, guildIds } = require('./config.json'); // ← guildIds に変更
const fs = require('node:fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    for (const guildId of guildIds) { // ← 配列をループ
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`✅ 登録完了: ${guildId} (${data.length} コマンド)`);
    }
    console.log('🎉 すべてのギルドへのコマンド登録が完了しました。');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
})();
