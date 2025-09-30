const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const MODE_URLS = {
    regular: {
        now: 'https://spla3.yuu26.com/api/regular/now',
        next: 'https://spla3.yuu26.com/api/regular/next',
    },
    'bankara-open': {
        now: 'https://spla3.yuu26.com/api/bankara-open/now',
        next: 'https://spla3.yuu26.com/api/bankara-open/next',
    },
    'bankara-challenge': {
        now: 'https://spla3.yuu26.com/api/bankara-challenge/now',
        next: 'https://spla3.yuu26.com/api/bankara-challenge/next',
    },
    fest: {
        now: 'https://spla3.yuu26.com/api/fest/now',
        next: 'https://spla3.yuu26.com/api/fest/next',
    },
    'fest-challenge': {
        now: 'https://spla3.yuu26.com/api/fest-challenge/now',
        next: 'https://spla3.yuu26.com/api/fest-challenge/next',
    },
    x: {
        now: 'https://spla3.yuu26.com/api/x/now',
        next: 'https://spla3.yuu26.com/api/x/next',
    },
    event: {
        now: 'https://spla3.yuu26.com/api/event/schedule',
        next: 'https://spla3.yuu26.com/api/event/schedule',
    },
    'coop-grouping': {
        now: 'https://spla3.yuu26.com/api/coop-grouping/now',
        next: 'https://spla3.yuu26.com/api/coop-grouping/next',
    },
    'coop-grouping-team-contest': {
        now: 'https://spla3.yuu26.com/api/coop-grouping-team-contest/schedule',
        next: 'https://spla3.yuu26.com/api/coop-grouping-team-contest/schedule',
    },
};

const USER_AGENT = 'SplaBot/1.0 (Contact: your_discord_username#0000 or your website)';

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
                .addChoices(
                    { name: 'レギュラーマッチ', value: 'regular' },
                    { name: 'バンカラマッチ(オープン)', value: 'bankara-open' },
                    { name: 'バンカラマッチ(チャレンジ)', value: 'bankara-challenge' },
                    { name: 'Xマッチ', value: 'x' },
                    { name: 'フェスマッチ(オープン)', value: 'fest' },
                    { name: 'フェスマッチ(チャレンジ)', value: 'fest-challenge' },
                    { name: 'イベントマッチ', value: 'event' },
                    { name: 'サーモンラン', value: 'coop-grouping' },
                    { name: 'バイトチームコンテスト', value: 'coop-grouping-team-contest' },
                )
        )
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

        const apiUrl = MODE_URLS[modeValue]?.[timeValue];
        if (!apiUrl) {
            console.warn(`[ステージ情報] URL未定義: mode=${modeValue}, time=${timeValue}`);
            await interaction.editReply('指定されたモード/時間の組み合わせに対応するURLが見つかりません。');
            return;
        }

        console.log(`[ステージ情報] APIリクエスト開始: ${apiUrl}`);

        try {
            const response = await axios.get(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
            const results = response.data.results;
            console.log(`[ステージ情報] APIレスポンス受信: ${results?.length || 0} 件`);

            if (!results || results.length === 0) {
                await interaction.editReply('現在このモードの情報はありません。');
                console.log(`[ステージ情報] データなし: mode=${modeValue}, time=${timeValue}`);
                return;
            }

            const info = results[0];
            const includeDate = modeValue.includes('coop-grouping'); // サーモンランは日付も表示
            const timeRange = formatSchedule(info.start_time, info.end_time, includeDate);

            const embed = new EmbedBuilder()
                .setTitle(`${modeValue} の情報`)
                .setDescription(`期間 (JST): ${timeRange}`)
                .setColor(0x0099FF);

            await interaction.editReply({ embeds: [embed] });

            console.log(`[ステージ情報] 正常に送信完了: mode=${modeValue}, time=${timeValue}`);

        } catch (error) {
            const status = error.response ? error.response.status : 'N/A';
            console.error(`[ステージ情報] API取得エラー: status=${status}, url=${apiUrl}`, error.message);
            await interaction.editReply('ステージ情報の取得に失敗しました。');
        }
    },
};
