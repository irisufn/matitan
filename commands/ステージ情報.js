const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const path = require('path');

// 💡 複数のステージ画像を合成して1枚の画像として返すAPIのURL
const STAGE_IMAGE_API = 'https://api.yuu26.com/splatoon3/stage-image.php'; 
const BASE_URL = 'https://spla3.yuu26.com/api/';

// 💡 APIのパスに対応する表示名とURLキー
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

// 💡 User-Agent設定（Botの連絡先を含める）
const USER_AGENT = 'SplaBot/1.0 (Contact: your_discord_username#0000 or your website)';

// 💡 時刻を "HH:MM" 形式に整形するヘルパー関数
const formatTime = (timeString) => {
    // 2025-09-25T23:00:00+09:00 のような形式から '23:00' を抽出
    const date = new Date(timeString);
    // 時刻を2桁で取得し、結合
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
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
                .addChoices(...MODES.map(m => ({ name: m.name, value: m.value })))
        )
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('取得するステージ情報（現在/次/スケジュール）を選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'now' },
                    { name: '次のステージ', value: 'next' },
                    { name: '今後のスケジュール (最大12個)', value: 'schedule' }
                )
        ),

    async execute(interaction) {
        // 3秒以内に応答を返す
        await interaction.deferReply(); 

        const modeValue = interaction.options.getString('モード');
        const timeValue = interaction.options.getString('時間');
        const modeTitle = MODES.find(m => m.value === modeValue).title;
        
        let apiUrl = '';
        
        // 💡 API URLの構築
        if (modeValue === 'coop-grouping' || modeValue === 'coop-grouping-team-contest') {
            // サーモンラン系のAPIは schedule のみ対応だが、念のためURLを統一
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
        } else if (modeValue === 'event') {
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
        } else if (timeValue === 'schedule') {
            apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
        } else {
            // regular/now, bankara-open/next など
            apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
        }

        try {
            // 💡 User-Agentを設定してAPIリクエスト
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': USER_AGENT }
            });
            
            // APIレスポンスから必要な情報を含む配列を取得
            let results = response.data.results;

            if (!results || results.length === 0) {
                // schedule 以外 (now/next) の場合は results[0] を確認
                if (timeValue !== 'schedule' && response.data.results && response.data.results.length > 0) {
                    results = [response.data.results[0]];
                } else if (timeValue !== 'schedule' && response.data.results) {
                    results = [response.data.results[0]];
                } else {
                    await interaction.editReply(`現在、**${modeTitle}** の情報はありません。`);
                    return;
                }
            } else if (timeValue !== 'schedule') {
                // now/next の場合、最初の1つだけを使用
                results = [results[0]];
            }

            // 💡 最初のステージ情報を取得して Embed を作成
            const firstInfo = results[0];
            
            // ステージ名と画像URLを取得
            const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : (firstInfo.stage ? firstInfo.stage.name : '不明');
            const stageImageUrls = firstInfo.stages ? firstInfo.stages.map(s => s.image) : (firstInfo.stage ? [firstInfo.stage.image] : []);
            
            // ルール名を取得 (サーモンラン系は rule がない)
            const ruleName = firstInfo.rule ? firstInfo.rule.name : (modeTitle.includes('サーモンラン') ? 'バイト' : '不明');
            
            // 期間を整形
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            const embed = new EmbedBuilder()
                .setTitle(`🦑 ${modeTitle} (${timeValue === 'schedule' ? '今後の予定' : ruleName}) 🦑`)
                .setDescription(`**${stageNames}**`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: ruleName, inline: true },
                    { name: '期間', value: timeRange, inline: true }
                );

            let files = [];
            // 💡 2枚の画像を合成して添付ファイルとして使用
            if (stageImageUrls.length > 0) {
                const imageUrls = stageImageUrls.slice(0, 2).join(','); // 最大2枚をカンマ区切りで結合
                const imageResponse = await axios.get(STAGE_IMAGE_API, {
                    params: { url: imageUrls },
                    responseType: 'arraybuffer', // バイナリデータとして受け取る
                    headers: { 'User-Agent': USER_AGENT }
                });

                const attachment = new AttachmentBuilder(imageResponse.data, { name: 'stage_image.png' });
                files.push(attachment);
                embed.setImage('attachment://stage_image.png');
            }

            await interaction.editReply({ embeds: [embed], files: files });

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            // axiosエラーの場合、ステータスコードを表示すると役立つ
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`API情報の取得に失敗しました。\n(エラーコード: ${status})`);
        }
    },
};