const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const BASE_URL = 'https://spla3.yuu26.com/api/'; 

// 💡 全てのゲームモードの定義
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

// 💡 User-Agent設定 (ご自身の連絡先に変更してください！)
const USER_AGENT = 'SplaBot/1.0 (Contact: your_discord_username#0000 or your website)';

// 💡 時刻を "HH:MM" 形式に整形するヘルパー関数
const formatTime = (timeString) => {
    // APIが返すタイムゾーン付きのISO 8601形式文字列を処理
    const date = new Date(timeString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。')
        // 🔽 モードオプション
        .addStringOption(option =>
            option.setName('モード')
                .setDescription('取得するゲームモードを選択してください。')
                .setRequired(true)
                .addChoices(...MODES.map(m => ({ name: m.name, value: m.value })))
        )
        // 🔽 時間オプション
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
        await interaction.deferReply(); 

        const modeValue = interaction.options.getString('モード');
        const timeValue = interaction.options.getString('時間');
        const modeData = MODES.find(m => m.value === modeValue);
        const modeTitle = modeData ? modeData.title : '不明なモード';
        
        let apiUrl = '';
        
        // 💡 選択されたモードと時間に基づいてAPI URLを決定
        if (modeValue.includes('coop-grouping') || modeValue === 'event' || timeValue === 'schedule') {
            // サーモンラン系、イベント、スケジュール指定の場合は /schedule に固定
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
        } else {
            // regular/now, bankara-open/next など
            apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
        }

        try {
            // User-Agentを設定してメインAPIにリクエストを実行
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': USER_AGENT }
            });
            
            let results = response.data.results;
            
            if (!results || results.length === 0) {
                await interaction.editReply(`現在、**${modeTitle}** の情報はありません。`);
                return;
            } else if (timeValue !== 'schedule' && results.length > 1) {
                // now/next の場合、最初の1つだけを使用
                results = [results[0]];
            }

            const firstInfo = results[0];
            
            // ステージ名を取得
            const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : (firstInfo.stage ? firstInfo.stage.name : '不明');
            
            // 💡 1枚目のステージ画像のURLを取得
            const stageImageUrl = firstInfo.stages && firstInfo.stages.length > 0 
                ? firstInfo.stages[0].image 
                : (firstInfo.stage ? firstInfo.stage.image : null);

            // ルール名を取得
            const ruleName = firstInfo.rule ? firstInfo.rule.name : (modeTitle.includes('サーモンラン') || modeTitle.includes('バイトチーム') ? 'バイト' : '不明');
            
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
            
            // 💡 ステージ画像が取得できた場合、Embedのサムネイルに設定
            if (stageImageUrl) {
                embed.setThumbnail(stageImageUrl);
            }
                
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`メインのステージ情報APIの取得に失敗しました。\n(エラーコード: ${status} またはネットワーク問題)`);
        }
    },
};