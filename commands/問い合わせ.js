const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('問い合わせ')
        .setDescription('問い合わせを送信します')
        .addStringOption(option =>
            option.setName('項目')
                .setDescription('問い合わせの種類を選択してください')
                .setRequired(true)
                .addChoices(
                    { name: 'バグ報告', value: 'バグ報告' },
                    { name: 'ヘルプ', value: 'ヘルプ' },
                    { name: '要望', value: '要望' }
                )
        )
        .addStringOption(option =>
            option.setName('内容')
                .setDescription('問い合わせ内容を入力してください')
                .setRequired(true)
        ),

    async execute(interaction) {
        const category = interaction.options.getString('項目');
        const content = interaction.options.getString('内容');
        const userId = interaction.user.id;

        const embed = new EmbedBuilder()
            .setTitle(category)
            .setDescription(content)
            .addFields({ name: '送信者', value: `<@${userId}>` })
            .setTimestamp()
            .setColor(0x00AE86); // 任意の色

        // 送信先チャンネルID
        const channelId = '1420395483247018155';
        const channel = interaction.client.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply({ content: '送信先チャンネルが見つかりません。', ephemeral: true });
        }

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: '問い合わせを送信しました。', ephemeral: true });
    }
};
