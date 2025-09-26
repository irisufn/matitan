const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const path = require('path'); // 💡 pathモジュールを追加
// 💡 canvas, loadImage のインポートは不要

const BASE_URL = 'https://spla3.yuu26.com/api/'; 

// 全てのゲームモードの定義
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

// 時刻を "HH:MM" 形式に整形するヘルパー関数 (JST +9時間処理を含む)
const formatTime = (timeString) => {
    const date = new Date(timeString);
    // date.getTime() + (9 * 60 * 60 * 1000) は、タイムゾーンオフセットを考慮せずにUTC時刻を9時間進めているため、
    // 正確にはロケール依存のタイムゾーン処理が必要です。
    // APIが+09:00形式でJSTを返していると仮定し、そのまま処理を継続します。
    // Discordボットが動く環境のタイムゾーン設定に依存しないよう、getUTCHours()などを利用する既存の処理を維持します。
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ステージ情報')
        .setDescription('Splatoon 3のステージ情報を表示します。') // 説明を簡略化
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
        // 🚨 3秒以内に処理を完了させるための最重要コード
        await interaction.deferReply(); 

        const modeValue = interaction.options.getString('モード');
        const timeValue = interaction.options.getString('時間');
        const modeData = MODES.find(m => m.value === modeValue);
        const modeTitle = modeData ? modeData.title : '不明なモード';
        
        let apiUrl = '';
        
        // 選択されたモードと時間に基づいてAPI URLを決定
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
            
            // 💡 2枚のステージ名を取得し、ファイル名を構成
            let attachment = null;
            let fileName = null;
            
            if (firstInfo.stages && firstInfo.stages.length >= 2) {
                // ファイル名形式: 「ステージ1名_ステージ2名.png」
                fileName = `${firstInfo.stages[0].name}_${firstInfo.stages[1].name}.png`;
                const filePath = path.join(process.cwd(), 'stages', fileName);
                
                // Discordに添付ファイルとして送信するためにAttachmentBuilderを使用
                // 💡 ファイルが存在しない場合のエラーハンドリングは含まれていません。
                // 💡 ボットが実行されている環境に 'stages' フォルダがあり、画像が保存されている必要があります。
                attachment = new AttachmentBuilder(filePath, { name: fileName });
            } else if (firstInfo.stage) {
                // ステージが1つのモードの場合（例: サーモンラン、イベントマッチなど）の対応はここでは行いません。
                // ご要望は「stages内にnameが2つある場合」の対応のため、ここではスキップします。
                // もし1ステージの場合の画像が必要であれば、個別の対応が必要です。
            }
            
            const ruleName = firstInfo.rule ? firstInfo.rule.name : (modeTitle.includes('サーモンラン') || modeTitle.includes('バイトチーム') ? 'バイト' : '不明');
            
            // JST (+9時間) に変換された期間を整形
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            const embed = new EmbedBuilder()
                .setTitle(`🦑 ${modeTitle} (${timeValue === 'schedule' ? '今後の予定' : ruleName}) 🦑`)
                .setDescription(`**${stageNames}**`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ルール', value: ruleName, inline: true },
                    { name: '期間 (JST)', value: timeRange, inline: true }
                );

            // 💡 結合済みの画像を添付ファイルとして設定
            if (attachment && fileName) {
                embed.setImage(`attachment://${fileName}`);
            }

            // 💡 2枚目の画像URLフィールドは削除

            // 💡 添付ファイル付きで返信
            await interaction.editReply({ embeds: [embed], files: attachment ? [attachment] : [] }); 

        } catch (error) {
            console.error('APIリクエストまたはファイル処理中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            // ファイルパスのエラーが発生した場合もこちらに落ちる
            await interaction.editReply(`ステージ情報APIの取得または画像ファイルの処理に失敗しました。\n(エラーコード: ${status} またはネットワーク/ファイル問題)`);
        }
    },
};