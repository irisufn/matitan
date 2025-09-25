const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報をJSON形式で出力します。')
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('現在のステージか次のステージかを選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'now' },
                    { name: '次のステージ', value: 'next' }
                )
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const time = interaction.options.getString('時間');
        const apiUrl = `https://spla3.yuu26.com/api/regular/${time}`;
        
        try {
            const response = await axios.get(apiUrl);
            
            // JSONデータを整形してコードブロックで表示
            const jsonOutput = JSON.stringify(response.data, null, 2);
            
            // 文字数が2000文字を超える場合はファイルとして送信
            if (jsonOutput.length > 2000) {
                const file = {
                    attachment: Buffer.from(jsonOutput),
                    name: `splatoon3_regular_${time}.json`
                };
                await interaction.editReply({ files: [file] });
            } else {
                await interaction.editReply({
                    content: '```json\n' + jsonOutput + '\n```'
                });
            }

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            await interaction.editReply('API情報の取得に失敗しました。');
        }
    },
};