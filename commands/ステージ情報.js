const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

// 💡 画像合成APIと基本URL
const STAGE_IMAGE_API = 'https://api.yuu26.com/splatoon3/stage-image.php'; 
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
    const date = new Date(timeString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3の全ゲームモードのステージ情報を表示します。')
        // 🔽 モードオプションの復活
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
            // サーモンラン系、イベント、またはスケジュール指定の場合は /schedule を使用
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
        } else {
            // regular/now, bankara-open/next など
            apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
        }

        try {
            // User-Agentを設定してAPIリクエストを実行
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': USER_AGENT }
            });
            
            let results = response.data.results;
            
            // APIからの応答チェックと、now/next指定時のデータ選定
            if (!results || results.length === 0) {
                await interaction.editReply(`現在、**${modeTitle}** の情報はありません。`);
                return;
            } else if (timeValue !== 'schedule' && results.length > 1) {
                // now/next の場合、最初の1つだけを使用
                results = [results[0]];
            }

            // 💡 Embedの作成は最初の情報(results[0])に基づいて行う
            const firstInfo = results[0];
            
            // ステージ名と画像URLを取得 (API形式: stages 配列)
            const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : (firstInfo.stage ? firstInfo.stage.name : '不明');
            const stageImageUrls = firstInfo.stages ? firstInfo.stages.map(s => s.image) : (firstInfo.stage ? [firstInfo.stage.image] : []);
            
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

            let files = [];
            // 💡 画像合成APIを利用して添付
            if (stageImageUrls.length > 0) {
                const imageUrls = stageImageUrls.slice(0, 2).join(','); 
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
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`API情報の取得または画像処理に失敗しました。\n(エラーコード: ${status} またはネットワーク問題)`);
        }
    },
};