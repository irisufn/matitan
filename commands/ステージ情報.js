const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    // 🔽 コマンドの定義とオプションの設定
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。')
        // 1つ目のオプション：ゲームモード
        .addStringOption(option =>
            option.setName('モード')
                .setDescription('取得するゲームモードを選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: 'レギュラーマッチ', value: 'regular' },
                )
        )
        // 2つ目のオプション：時間
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('現在のステージか次のステージかを選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'now' },
                    { name: '次のステージ', value: 'next' }
                )
        ),
    // 🔼 ここまで

    // 🔽 実行処理
    async execute(interaction) {
        await interaction.deferReply();

        const mode = interaction.options.getString('モード');
        const time = interaction.options.getString('時間');
        
        let apiUrl = '';
        
        // モードと時間に応じてAPIのURLを決定
        if (mode === 'regular') {
            apiUrl = `https://spla3.yuu26.com/api/regular/${time}`;
        } else {
            // 他のモードを追加する場合はここに処理を記述
            await interaction.editReply('そのゲームモードはまだサポートされていません。');
            return;
        }

        try {
            const response = await axios.get(apiUrl);
            const stageInfo = response.data.results[0];
            
            if (!stageInfo || !stageInfo.stages) {
                await interaction.editReply('ステージ情報が見つかりませんでした。');
                return;
            }

            const stageNames = stageInfo.stages.map(s => s.name).join(' & ');
            const title = `🦑 レギュラーマッチ (${time === 'now' ? '現在' : '次'}) 🦑`;

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: stageInfo.rule.name, inline: true },
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