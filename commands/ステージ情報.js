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
    'regular': 'https://github.com/irisufn/images_matitan/blob/main/stages/mode/regular.png',
    'bankara-open': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/bankara.png',
    'bankara-challenge': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/bankara.png',
    'x': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/x.png',
    'fest': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/fest.png',
    'fest-challenge': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/fest.png',
    'event': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/event.png',
};

const RULE_THUMBNAILS = {
    'AREA': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/area.png',
    'LOFT': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/loft.png',
    'GOAL': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/goal.png',
    'CLAM': 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/clam.png',
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
                await interaction.editReply(`現在、**${modeTitle}** の情報はありません。`);
                return;
            }

            results = [results[0]];
            const firstInfo = results[0];
            const isCoopMode = modeValue.includes('coop-grouping');
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;
            let embed = new EmbedBuilder();

            // Embed Author
            embed.setAuthor({
                name: modeTitle,
                iconURL: MODE_ICONS[modeValue] || undefined
            });

            if (isCoopMode) {
                const stageName = firstInfo.stage ? firstInfo.stage.name : '不明なステージ';
                const bossName = firstInfo.boss ? firstInfo.boss.name : '不明なオオモノシャケ';
                const weapons = firstInfo.weapons ? firstInfo.weapons.map(w => w.name).join(' / ') : '不明なブキ';

                embed.setDescription(`**場所:** ${stageName}\n**ブキ:** ${weapons}\n**期間 (JST):** ${timeRange}`)
                    .addFields({ name: 'オオモノシャケ', value: bossName, inline: false })
                    .setColor(0xFF4500)
                    .setImage(`https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/${encodeURIComponent(stageName)}.png`)
                    .setThumbnail(`https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/${encodeURIComponent(bossName)}.png`);
            } else {
                const stageNames = firstInfo.stages && firstInfo.stages.length >= 2
                    ? firstInfo.stages.map(s => s.name).join('_')
                    : (firstInfo.stage ? firstInfo.stage.name : '不明');
                const ruleKey = firstInfo.rule ? firstInfo.rule.key : '';
                const ruleName = firstInfo.rule ? firstInfo.rule.name : '不明';

                embed.setDescription(`**${firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : stageNames}**`)
                    .addFields(
                        { name: 'ルール', value: ruleName, inline: true },
                        { name: '期間 (JST)', value: timeRange, inline: true }
                    )
                    .setColor(0x0099FF)
                    .setImage(`https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(firstInfo.stages[0].name)}_${encodeURIComponent(firstInfo.stages[1].name)}.png`);

                if (ruleKey && ruleKey !== 'TURF_WAR' && RULE_THUMBNAILS[ruleKey]) {
                    embed.setThumbnail(RULE_THUMBNAILS[ruleKey]);
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('API取得またはEmbed処理中にエラー:', error);
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`ステージ情報の取得に失敗しました。\n(エラーコード: ${status})`);
        }
    },
};
