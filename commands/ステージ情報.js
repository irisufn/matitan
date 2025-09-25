const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。')
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
            
            // APIレスポンスの 'results' 配列の最初の要素を取得
            const stageInfo = response.data.results[0]; 
            
            // データが存在しない場合のエラーハンドリング
            if (!stageInfo || !stageInfo.stages) {
                await interaction.editReply('ステージ情報が見つかりませんでした。');
                return;
            }

            const stageNames = stageInfo.stages.map(s => s.name).join(' & ');
            const ruleName = stageInfo.rule.name;
            const title = `🦑 レギュラーマッチ (${time === 'now' ? '現在' : '次'}) 🦑`;

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: ruleName, inline: true },
                    { name: 'ステージ', value: stageNames, inline: true },
                    { name: '期間', value: `${stageInfo.start_time.slice(5, 16)} ~ ${stageInfo.end_time.slice(5, 16)}` }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            await interaction.editReply('API情報の取得に失敗しました。');
        }
    },
};