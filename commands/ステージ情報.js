const { SlashCommandBuilder, EmbedBuilder } = require('discord.js'); // 💡 AttachmentBuilder, createCanvas, loadImage を削除
const axios = require('axios');

// 💡 画像合成APIや canvas 関連の定数は不要

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
        .setDescription('Splatoon 3 レギュラーマッチのステージ情報を表示します (画像なし)。') // 説明を更新
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
            // 💡 画像URLの取得は行うが、使用しない
            // const stageImageUrls = firstInfo.stages ? firstInfo.stages.map(s => s.image) : [];
            
            const ruleName = firstInfo.rule ? firstInfo.rule.name : '不明';
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            // 💡 Embedのみを送信 (画像添付はしない)
            const embed = new EmbedBuilder()
                .setTitle(`🦑 レギュラーマッチ (${timeValue === 'schedule' ? '今後の予定' : ruleName}) 🦑`)
                .setDescription(`**${stageNames}**`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: ruleName, inline: true },
                    { name: '期間', value: timeRange, inline: true }
                );

            await interaction.editReply({ embeds: [embed] }); // 💡 files:[] を削除

        } catch (error) {
            console.error('APIリクエスト中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`API情報の取得に失敗しました。\n(エラーコード: ${status} またはネットワーク問題)`);
        }
    },
};