const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas'); // 💡 canvasライブラリをインポート

// 💡 画像合成APIは不要になるため削除
const BASE_URL = 'https://spla3.yuu26.com/api/regular/'; // レギュラーマッチ専用に固定

// 💡 User-Agent設定 (ご自身の連絡先に変更してください)
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
        .setDescription('Splatoon 3 レギュラーマッチのステージ情報を表示します。')
        .addStringOption(option =>
            option.setName('モード')
                .setDescription('レギュラーマッチを選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: 'レギュラーマッチ', value: 'regular' },
                )
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

        const timeValue = interaction.options.getString('時間');
        const apiUrl = `${BASE_URL}${timeValue}`;

        try {
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': USER_AGENT }
            });
            
            let results = response.data.results;
            
            if (!results || results.length === 0) {
                await interaction.editReply(`現在、レギュラーマッチの情報はありません。`);
                return;
            } else if (timeValue !== 'schedule' && results.length > 1) {
                results = [results[0]];
            }

            const firstInfo = results[0];
            
            const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : '不明';
            const stageImageUrls = firstInfo.stages ? firstInfo.stages.map(s => s.image) : [];
            const ruleName = firstInfo.rule ? firstInfo.rule.name : '不明';
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            let files = [];
            let embed = new EmbedBuilder()
                .setTitle(`🦑 レギュラーマッチ (${timeValue === 'schedule' ? '今後の予定' : ruleName}) 🦑`)
                .setDescription(`**${stageNames}**`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: ruleName, inline: true },
                    { name: '期間', value: timeRange, inline: true }
                );

            // 💡 canvasで画像を連結する処理
            if (stageImageUrls.length > 0) {
                const imagesToLoad = stageImageUrls.slice(0, 2); // 最大2枚の画像を処理
                const loadedImages = await Promise.all(imagesToLoad.map(url => loadImage(url)));

                // 2枚の画像を並べるためのキャンバスサイズを計算
                let totalWidth = 0;
                let maxHeight = 0;
                loadedImages.forEach(img => {
                    totalWidth += img.width;
                    if (img.height > maxHeight) {
                        maxHeight = img.height;
                    }
                });

                // 各画像間に10pxの余白を追加
                if (loadedImages.length === 2) {
                    totalWidth += 10; 
                }

                const canvas = createCanvas(totalWidth, maxHeight);
                const ctx = canvas.getContext('2d');

                let currentX = 0;
                loadedImages.forEach(img => {
                    // 画像を中央揃えで描画 (オプション)
                    const y = (maxHeight - img.height) / 2;
                    ctx.drawImage(img, currentX, y, img.width, img.height);
                    currentX += img.width + 10; // 次の画像のためにX座標を更新 (余白含む)
                });

                // キャンバスから画像をBufferとして取得
                const buffer = canvas.toBuffer('image/png');
                const attachment = new AttachmentBuilder(buffer, { name: 'combined_stages.png' });
                files.push(attachment);
                embed.setImage('attachment://combined_stages.png');
            }

            await interaction.editReply({ embeds: [embed], files: files });

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            // canvas関連のエラーの場合、詳細をログに出す
            if (error.name === 'AbortError' || error.message.includes('pre-built binaries')) {
                console.error('canvasの読み込みまたはビルドに失敗しました。前提条件が満たされているか確認してください。');
            }
            await interaction.editReply(`API情報の取得または画像処理に失敗しました。\n(エラーコード: ${status} またはネットワーク問題)`);
        }
    },
};