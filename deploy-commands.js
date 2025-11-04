require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const { clientId, guildId } = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    
    // ⚡ v14対応: 必須オプションを先にする
    if (command.data.options) {
        command.data.options.sort((a, b) => {
            return (a.required === true && b.required === false) ? -1
                 : (a.required === false && b.required === true) ? 1
                 : 0;
        });
    }

    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
