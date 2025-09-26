const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

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

// 💡 時刻を "HH:MM" 形式に整形するヘルパー関数 (JST +9時間処理を追加)
const formatTime = (timeString) => {
    const date = new Date(timeString);
    
    // 9時間分のミリ秒 (9 * 60分 * 60秒 * 1000ミリ秒) を加算
    // APIの時刻はUTC（Z）として処理されることが多いため、9時間加算してJSTに変換する。
    const jstTime = date.getTime() + (9 * 60 * 60 * 1000);
    const jstDate = new Date(jstTime);
    
    // getUTCHours()とgetUTCMinutes()で時刻を取得することで、
    // 実行環境のローカルタイムゾーンに影響されずに、9時間加算後の時刻を表示できる
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を日本時間で表示します。')
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
        await interaction.deferReply(); 

        const modeValue = interaction.options.getString('モード');
        const timeValue = interaction.options.getString('時間');
        const modeData = MODES.find(m => m.value === modeValue);
        const modeTitle = modeData ? modeData.title : '不明なモード';
        
        let apiUrl = '';
        
        // 💡 選択されたモードと時間に基づいてAPI URLを決定
        if (modeValue.includes('coop-grouping') || modeValue === 'event' || timeValue === 'schedule') {
            apiUrl = `${BASE_URL}${modeValue}/schedule`;
        } else {
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
                results = [results[0]];
            }

            const firstInfo = results[0];
            
            const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : (firstInfo.stage ? firstInfo.stage.name : '不明');
            const stageImageUrls = firstInfo.stages ? firstInfo.stages.map(s => s.image) : (firstInfo.stage ? [firstInfo.stage.image] : []);
            
            const ruleName = firstInfo.rule ? firstInfo.rule.name : (modeTitle.includes('サーモンラン') || modeTitle.includes('バイトチーム') ? 'バイト' : '不明');
            
            // 💡 JST (+9時間) に変換された期間を整形
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            let files = [];
            let embed = new EmbedBuilder()
                .setTitle(`🦑 ${modeTitle} (${timeValue === 'schedule' ? '今後の予定' : ruleName}) 🦑`)
                .setDescription(`**${stageNames}**`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: ruleName, inline: true },
                    { name: '期間 (JST)', value: timeRange, inline: true }
                );

            // 💡 canvasで画像を連結する処理
            if (stageImageUrls.length > 0) {
                const imagesToLoad = stageImageUrls.slice(0, 2); 
                
                try {
                    const loadedImages = await Promise.all(imagesToLoad.map(url => loadImage(url)));

                    let totalWidth = 0;
                    let maxHeight = 0;
                    loadedImages.forEach(img => {
                        totalWidth += img.width;
                        if (img.height > maxHeight) {
                            maxHeight = img.height;
                        }
                    });

                    if (loadedImages.length === 2) {
                        totalWidth += 10; // 10pxの余白
                    }

                    const canvas = createCanvas(totalWidth, maxHeight);
                    const ctx = canvas.getContext('2d');

                    let currentX = 0;
                    loadedImages.forEach(img => {
                        const y = (maxHeight - img.height) / 2;
                        ctx.drawImage(img, currentX, y, img.width, img.height);
                        currentX += img.width + 10;
                    });

                    const buffer = canvas.toBuffer('image/png');
                    const attachment = new AttachmentBuilder(buffer, { name: 'combined_stages.png' });
                    files.push(attachment);
                    embed.setImage('attachment://combined_stages.png');

                } catch (imgError) {
                    console.error('画像読み込みまたはcanvas処理中にエラーが発生しました:', imgError);
                    embed.setFooter({ text: 'ステージ画像の読み込みまたは結合に失敗しました。' });
                }
            }

            await interaction.editReply({ embeds: [embed], files: files });

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`ステージ情報APIの取得に失敗しました。\n(エラーコード: ${status} またはネットワーク問題)`);
        }
    },
};