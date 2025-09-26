const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const BASE_URL = 'https://spla3.yuu26.com/api/';

const MODES = [
    { name: 'レギュラーマッチ', value: 'regular', title: 'レギュラーマッチ' },
    { name: 'バンカラマッチ(オープン)', value: 'bankara-open', title: 'バンカラマッチ (オープン)' },
    { name: 'バンカラマッチ(チャレンジ)', value: 'bankara-challenge', title: 'バンカラマッチ (チャレンジ)' },
    { name: 'Xマッチ', value: 'x', title: 'Xマッチ' },
    { name: 'フェスマッチ(オープン)', value: 'fest', title: 'フェスマッチ (オープン)' },
    { name: 'フェスマッチ(チャレンジ)', value: 'fest-challenge', title: 'フェスマッチ (チャレンジ)' },
    { name: 'イベントマッチ', value: 'event', title: 'イベントマッチ' },
    { name: 'サーモンラン', value: 'coop-grouping', title: 'サーモンラン' },
    { name: 'バイトチームコンテスト', value: 'coop-grouping-team-contest', title: 'バイトチームコンテスト' },
];

const MODE_ICONS = {
    regular: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/regular.png',
    'bankara-open': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/bankara.png',
    'bankara-challenge': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/bankara.png',
    x: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/x.png',
    event: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/event.png',
    fest: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/fest.png',
};

const RULE_THUMBNAILS = {
    TURF_WAR: null,
    AREA: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/area.png',
    LOFT: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/loft.png',
    GOAL: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/goal.png',
    CLAM: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/clam.png',
};

const USER_AGENT = 'SplaBot/1.0 (Contact: your_discord_username#0000 or your website)';

const formatTime = (timeString) => {
    const date = new Date(timeString);
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。')
        .addStringOption(option =>
            option.setName('モード')
                .setDescription('取得するゲームモードを選択してください。')
                .setRequired(true)
                .addChoices(...MODES.map(m => ({ name: m.name, value: m.value }))))
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('取得するステージ情報（現在/次）を選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'now' },
                    { name: '次のステージ', value: 'next' }
                )),
    async execute(interaction) {
        await interaction.deferReply();

        const modeValue = interaction.options.getString('モード');
        const timeValue = interaction.options.getString('時間');
        const modeData = MODES.find(m => m.value === modeValue);
        const modeTitle = modeData ? modeData.title : '不明なモード';

        let apiUrl = '';
        if (modeValue.includes('coop-grouping') || modeValue === 'event') {
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
        } else {
            apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
        }

        try {
            const response = await axios.get(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
            let results = response.data.results;

            if (!results || results.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setAuthor({ name: modeTitle, iconURL: MODE_ICONS[modeValue] || null })
                    .setDescription('現在このモードの情報はありません。')
                    .setColor(0x808080);
                await interaction.editReply({ embeds: [emptyEmbed] });
                return;
            }

            results = [results[0]];
            const firstInfo = results[0];
            const isCoopMode = modeValue.includes('coop-grouping');

            // イベントマッチ特別処理
            if (modeValue === 'event') {
                if (!firstInfo.rule || !firstInfo.stages) {
                    const embed = new EmbedBuilder()
                        .setColor(0x808080)
                        .setAuthor({ name: modeTitle, iconURL: MODE_ICONS['event'] })
                        .setDescription('現在イベントマッチは開催していません。');
                    return interaction.editReply({ embeds: [embed] });
                }

                const now = new Date();
                const start = new Date(firstInfo.start_time);
                const end = new Date(firstInfo.end_time);

                if (now < start) {
                    const embed = new EmbedBuilder()
                        .setColor(0x808080)
                        .setAuthor({ name: modeTitle, iconURL: MODE_ICONS['event'] })
                        .setDescription(`次回は ${formatTime(firstInfo.start_time)} ~ ${formatTime(firstInfo.end_time)} に開催予定です。`);
                    return interaction.editReply({ embeds: [embed] });
                }
            }

            const embed = new EmbedBuilder();
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            if (isCoopMode) {
                const stageName = firstInfo.stage ? firstInfo.stage.name : '不明なステージ';
                const bossName = firstInfo.boss ? firstInfo.boss.name : '不明なオオモノシャケ';
                const weapons = firstInfo.weapons ? firstInfo.weapons.map(w => w.name).join(' / ') : '不明なブキ';

                embed.setAuthor({
                    name: modeTitle,
                    iconURL: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/salmon.png'
                });

                embed.setDescription(`**場所:** ${stageName}\n**ブキ:** ${weapons}\n**期間 (JST):** ${timeRange}`)
                    .addFields({ name: 'オオモノシャケ', value: bossName, inline: false })
                    .setColor(0xFF4500);

                const stageURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/${encodeURIComponent(stageName)}.png`;
                const bossURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/${encodeURIComponent(bossName)}.png`;

                embed.setImage(stageURL).setThumbnail(bossURL);

            } else {
                embed.setAuthor({ name: modeTitle, iconURL: MODE_ICONS[modeValue] || null });

                const stageNames = firstInfo.stages
                    ? firstInfo.stages.length === 1
                        ? firstInfo.stages[0].name
                        : `${firstInfo.stages[0].name}_${firstInfo.stages[1].name}`
                    : (firstInfo.stage ? firstInfo.stage.name : '不明');

                const ruleName = firstInfo.rule ? firstInfo.rule.name : '不明';
                embed.setDescription(`**${stageNames}**`)
                    .addFields(
                        { name: 'ルール', value: ruleName, inline: true },
                        { name: '期間 (JST)', value: timeRange, inline: true }
                    )
                    .setColor(0x0099FF);

                if (firstInfo.stages) {
                    if (firstInfo.stages.length === 1) {
                        const stageURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(firstInfo.stages[0].name)}.png`;
                        embed.setImage(stageURL);
                    } else {
                        const stageURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(firstInfo.stages[0].name)}_${encodeURIComponent(firstInfo.stages[1].name)}.png`;
                        embed.setImage(stageURL);
                    }
                } else if (firstInfo.stage) {
                    const stageURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(firstInfo.stage.name)}.png`;
                    embed.setImage(stageURL);
                }

                let thumbnailURL = null;
                if (modeValue === 'regular') {
                    thumbnailURL = MODE_ICONS['regular'];
                } else if (firstInfo.rule && RULE_THUMBNAILS[firstInfo.rule.key]) {
                    thumbnailURL = RULE_THUMBNAILS[firstInfo.rule.key];
                }
                if (thumbnailURL) embed.setThumbnail(thumbnailURL);
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('API取得またはEmbed処理中にエラー:', error);
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`ステージ情報APIの取得またはEmbed処理に失敗しました。\n(エラーコード: ${status})`);
        }
    },
};
