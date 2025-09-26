const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const path = require('path'); 

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
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
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
                .addChoices(...MODES.map(m => ({ name: m.name, value: m.value })))
        )
        .addStringOption(option =>
            option.setName('時間')
                .setDescription('取得するステージ情報（現在/次）を選択してください。')
                .setRequired(true)
                .addChoices(
                    { name: '現在のステージ', value: 'now' },
                    { name: '次のステージ', value: 'next' }
                    // 💡 「今後のスケジュール (最大12個)」を廃止
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
        // 💡 スケジュールオプションが無くなったため、coop-groupingとeventのみ /schedule を使用
        if (modeValue.includes('coop-grouping') || modeValue === 'event') {
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
            } 
            
            // 💡 スケジュールが無くなったため、常に最初の要素のみを使用するように修正
            results = [results[0]];
            
            const firstInfo = results[0];
            const isCoopMode = modeValue.includes('coop-grouping');
            
            let embed;
            const attachments = [];

            // JST (+9時間) に変換された期間を整形
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;

            // --- サーモンラン (COOP) モードの処理 ---
            if (isCoopMode) {
                const stageName = firstInfo.stage ? firstInfo.stage.name : '不明なステージ';
                const bossName = firstInfo.boss ? firstInfo.boss.name : '不明なオオモノシャケ';
                // 武器名を取得し、名前の配列にする
                const weapons = firstInfo.weapons 
                    ? firstInfo.weapons.map(w => w.name).join(' / ') 
                    : '不明なブキ';
                
                // --- Embedの説明 (ステージ場所、ブキ、時間) の構築 ---
                const description = 
                    `**場所:** ${stageName}\n` +
                    `**ブキ:** ${weapons}\n` +
                    `**期間 (JST):** ${timeRange}`;

                embed = new EmbedBuilder()
                    .setTitle(`💰 ${modeTitle} 💰`)
                    .setDescription(description)
                    .setColor(0xFF4500) // サーモンランなのでオレンジ色
                    .addFields(
                        { name: 'オオモノシャケ', value: bossName, inline: false }
                    );

                // --- メイン画像 (ステージ画像) の添付 ---
                let stageAttachment = null;
                const stageFileName = `${stageName}.png`;
                // 💡 フォルダパス: images/サーモンラン/ステージのname.png
                const stageFilePath = path.join(process.cwd(), 'images', 'サーモンラン', stageFileName);
                try {
                    stageAttachment = new AttachmentBuilder(stageFilePath, { name: stageFileName });
                    attachments.push(stageAttachment);
                    embed.setImage(`attachment://${stageFileName}`);
                } catch (e) {
                    console.warn(`ステージ画像が見つかりませんでした: ${stageFilePath}`);
                }

                // --- サムネイル (ボス画像) の添付 ---
                let bossAttachment = null;
                const bossFileName = `${bossName}.png`;
                // 💡 フォルダパス: images/サーモンラン/ボスのname.png
                const bossFilePath = path.join(process.cwd(), 'images', 'サーモンラン', bossFileName);
                try {
                    bossAttachment = new AttachmentBuilder(bossFilePath, { name: bossFileName });
                    attachments.push(bossAttachment);
                    // 💡 setThumbnailにボス画像を設定
                    embed.setThumbnail(`attachment://${bossFileName}`);
                } catch (e) {
                    console.warn(`オオモノシャケ画像が見つかりませんでした: ${bossFilePath}`);
                }
            } 
            // --- レギュラー/バンカラ/Xマッチ/フェスなどの処理 (元のロジック) ---
            else {
                const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : (firstInfo.stage ? firstInfo.stage.name : '不明');
                const ruleName = firstInfo.rule ? firstInfo.rule.name : '不明';

                embed = new EmbedBuilder()
                    .setTitle(`🦑 ${modeTitle} (${ruleName}) 🦑`) // 💡 スケジュールがなくなったため、条件を削除
                    .setDescription(`**${stageNames}**`)
                    .setColor(0x0099FF)
                    .addFields(
                        { name: 'ルール', value: ruleName, inline: true },
                        { name: '期間 (JST)', value: timeRange, inline: true }
                    );

                // --- 2ステージ結合画像 (stagesフォルダ) の添付 ---
                let attachment = null;
                let fileName = null;
                
                if (firstInfo.stages && firstInfo.stages.length >= 2) {
                    // ファイル名形式: 「ステージ1名_ステージ2名.png」
                    fileName = `${firstInfo.stages[0].name}_${firstInfo.stages[1].name}.png`;
                    // 注意: フォルダ名が 'stages' になっています
                    const filePath = path.join(process.cwd(), 'stages', fileName);
                    
                    try {
                         attachment = new AttachmentBuilder(filePath, { name: fileName });
                         attachments.push(attachment);
                         embed.setImage(`attachment://${fileName}`);
                    } catch (e) {
                         console.warn(`通常マッチ ステージ結合画像が見つかりませんでした: ${filePath}`);
                    }
                }
            }
            
            // 💡 添付ファイル付きで返信
            await interaction.editReply({ embeds: [embed], files: attachments }); 

        } catch (error) {
            console.error('APIリクエストまたはファイル処理中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            // ファイルの読み込み失敗 (ENOENT: no such file or directory) の場合もここに落ちます
            await interaction.editReply(`ステージ情報APIの取得または画像ファイルの処理に失敗しました。\n(エラーコード: ${status} またはネットワーク/ファイル問題)`);
        }
    },
};