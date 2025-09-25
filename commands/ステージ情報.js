const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。')
        .addStringOption(option =>
            option.setName('モード')
                .setDescription('取得するゲームモードを選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: 'レギュラーマッチ', value: 'regular' },
                    { name: 'バンカラマッチ(オープン)', value: 'bankara_open' },
                    { name: 'バンカラマッチ(チャレンジ)', value: 'bankara_challenge' },
                    { name: 'Xマッチ', value: 'x_match' },
                    { name: 'フェスマッチ(オープン)', value: 'fest_open' }, // ◀️ フェスマッチ(オープン)を追加
                    { name: 'フェスマッチ(チャレンジ)', value: 'fest_challenge' }, // ◀️ フェスマッチ(チャレンジ)を追加
                    { name: 'サーモンラン', value: 'salmonrun' },
                    { name: 'サーモンラン(バイトチームコンテスト)', value: 'salmonrun_contest' }
                )
        )
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('現在のステージか次のステージかを選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'current' },
                    { name: '次のステージ', value: 'next' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const mode = interaction.options.getString('モード');
        const time = interaction.options.getString('時間');
        const index = time === 'current' ? 0 : 1;

        let apiUrl = '';
        let title = '';
        let info = null;

        try {
            if (mode.includes('salmonrun')) {
                apiUrl = 'https://spla3.yuu26.com/api/salmonrun';
                const response = await axios.get(apiUrl);
                const data = response.data;
                title = `🐻‍❄️ サーモンラン(${time === 'current' ? '現在' : '次'}) 🐻‍❄️`;

                if (mode === 'salmonrun') {
                    info = data[index];
                } else if (mode === 'salmonrun_contest') {
                    info = data.contest[0];
                    title = `🐻‍❄️ バイトチームコンテスト 🐻‍❄️`;
                }

            } else {
                apiUrl = 'https://spla3.yuu26.com/api/schedule';
                const response = await axios.get(apiUrl);
                const data = response.data.results;

                title = `🦑 ${mode.toUpperCase()} (${time === 'current' ? '現在' : '次'}) 🦑`;
                
                // フェスマッチ(オープン/チャレンジ)はAPIレスポンスの対応するキーを参照
                if (mode === 'fest_open') {
                    info = data.fest_open[index];
                } else if (mode === 'fest_challenge') {
                    info = data.fest_challenge[index];
                } else {
                    info = data[mode][index];
                }
            }

            if (!info) {
                await interaction.editReply('指定された情報が見つかりませんでした。');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ステージ', value: info.maps ? info.maps.join(' & ') : info.stage.name, inline: true },
                    { name: '武器', value: info.weapons ? info.weapons.map(w => w.name).join(' & ') : 'なし', inline: true },
                    { name: '期間', value: `${info.start_time.slice(5, 16)} ~ ${info.end_time.slice(5, 16)}` }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            await interaction.editReply('API情報の取得に失敗しました。');
        }
    },
};