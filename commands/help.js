const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('利用可能なコマンド一覧を表示します'),

    async execute(interaction) {
        // commands フォルダのパス
        const commandsPath = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && file !== 'help.js');

        // コマンド名一覧
        const commandList = commandFiles.map(file => {
            const command = require(path.join(commandsPath, file));
            return `</${command.data.name}:${interaction.client.application.commands.cache.find(cmd => cmd.name === command.data.name)?.id || "未登録"}> - ${command.data.description}`;
        });

        // Embed 作成
        const embed = new EmbedBuilder()
            .setTitle('📖 コマンド一覧')
            .setDescription(commandList.join('\n') || 'コマンドが見つかりませんでした。')
            .setColor('#11edaa')
            .setFooter({ text: '公式サイトもぜひご利用ください。' });

        // ボタン作成
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('公式HP')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://matitan.onrender.com/index.html')
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
