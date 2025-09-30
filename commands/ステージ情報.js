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

const USER_AGENT = 'SplaBot/1.0 (irisu1002you@gmail.com)';

const formatSchedule = (startTime, endTime, includeDate = false) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const jstOffset = 9 * 60 * 60 * 1000;
    const startJST = new Date(start.getTime() + jstOffset);
    const endJST = new Date(end.getTime() + jstOffset);

    const pad = (n) => n.toString().padStart(2, '0');
    const startStr = includeDate
        ? `${startJST.getFullYear()}/${pad(startJST.getMonth()+1)}/${pad(startJST.getDate())} ${pad(startJST.getHours())}:${pad(startJST.getMinutes())}`
        : `${pad(startJST.getHours())}:${pad(startJST.getMinutes())}`;
    const endStr = includeDate
        ? `${endJST.getFullYear()}/${pad(endJST.getMonth()+1)}/${pad(endJST.getDate())} ${pad(endJST.getHours())}:${pad(endJST.getMinutes())}`
        : `${pad(endJST.getHours())}:${pad(endJST.getMinutes())}`;

    return `${startStr} 〜 ${endStr}`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。')
        .addStringOption(option =>
            option.setName('モード')
                .setDescription('取得するゲームモードを選択してください。')
                .setRequired(true)
                .addChoices(...MODES.map(m => ({ name: m.name, value: m.value })))
        )
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('取得するステージ情報（現在/次/次の次）を選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'now' },
                    { name: '次のステージ', value: 'next' },
                    { name: '次の次のステージ', value: 'next2' }
                )),
    async execute(interaction) {
        await interaction.deferReply();

        const modeValue = interaction.options.getString('モード');
        const timeValue = interaction.options.getString('時間');
        const modeData = MODES.find(m => m.value === modeValue);
        const modeTitle = modeData ? modeData.title : '不明なモード';

        let apiUrl;
        let useSchedule = false;

        if (modeValue.includes('coop-grouping') || modeValue === 'event') {
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
            useSchedule = true;
        } else {
            if (timeValue === 'now' || timeValue === 'next') {
                apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
            } else if (timeValue === 'next2') {
                apiUrl = `${BASE_URL}${modeValue}/schedule`;
                useSchedule = true;
            }
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

            let info;
            if (useSchedule) {
                let index = 0;
                if (timeValue === 'next') index = 1;
                else if (timeValue === 'next2') index = 2;
                info = results[index] || results[results.length - 1];
            } else {
                info = results[0];
            }

            const isCoopMode = modeValue.includes('coop-grouping');
            const embed = new EmbedBuilder();

            const includeDate = isCoopMode; // サーモンランは日付も表示
            const timeRange = formatSchedule(info.start_time, info.end_time, includeDate);

            if (isCoopMode) {
                const stageName = info.stage ? info.stage.name : '不明なステージ';
                const bossName = info.boss ? info.boss.name : '不明なオオモノシャケ';
                const weapons = info.weapons ? info.weapons.map(w => w.name).join(' / ') : '不明なブキ';

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

                const stageNames = info.stages
                    ? info.stages.length === 1
                        ? info.stages[0].name
                        : `${info.stages[0].name}_${info.stages[1].name}`
                    : (info.stage ? info.stage.name : '不明');

                const ruleName = info.rule ? info.rule.name : '不明';
                embed.setDescription(`**${stageNames}**`)
                    .addFields(
                        { name: 'ルール', value: ruleName, inline: true },
                        { name: '期間 (JST)', value: timeRange, inline: true }
                    )
                    .setColor(0x0099FF);

                if (info.stages) {
                    const stageURL = info.stages.length === 1
                        ? `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(info.stages[0].name)}.png`
                        : `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(info.stages[0].name)}_${encodeURIComponent(info.stages[1].name)}.png`;
                    embed.setImage(stageURL);
                } else if (info.stage) {
                    const stageURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(info.stage.name)}.png`;
                    embed.setImage(stageURL);
                }

                let thumbnailURL = null;
                if (modeValue === 'regular') {
                    thumbnailURL = MODE_ICONS['regular'];
                } else if (info.rule && RULE_THUMBNAILS[info.rule.key]) {
                    thumbnailURL = RULE_THUMBNAILS[info.rule.key];
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
