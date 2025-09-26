const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://spla3.yuu26.com/api/';
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/';

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

const USER_AGENT = 'SplaBot/1.0 (Contact: your_discord_username#0000 or your website)';

const formatTime = (timeString) => {
    const date = new Date(timeString);
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// 画像をAttachmentとして作成するヘルパー (ローカル画像を使わないため、サーモンラン以外の処理で残す)
const tryAttachImage = (filePath, fileName) => {
    if (fs.existsSync(filePath)) {
        return new AttachmentBuilder(filePath, { name: fileName });
    }
    return null;
};

// サーモンランの画像URLを生成するヘルパー関数
const getCoopImageURL = (name, type) => {
    // URLエンコードされた名前を取得
    const encodedName = encodeURIComponent(name);

    if (type === 'boss') {
        // ボスアイコンのURLを生成
        return `${IMAGE_BASE_URL}boss%E3%81%AE${encodedName}.png`;
    } else if (type === 'stage') {
        // ステージ画像のURLを生成
        return `${IMAGE_BASE_URL}${encodedName}.png`;
    }
    return null;
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

            results = [results[0]]; // 常に最初の要素のみ
            const firstInfo = results[0];
            const isCoopMode = modeValue.includes('coop-grouping');

            let attachments = [];
            const timeRange = `${formatTime(firstInfo.start_time)} 〜 ${formatTime(firstInfo.end_time)}`;
            let embed;

            if (isCoopMode) {
                const stageName = firstInfo.stage ? firstInfo.stage.name : '不明なステージ';
                const bossName = firstInfo.boss ? firstInfo.boss.name : '不明なオオモノシャケ';
                const weapons = firstInfo.weapons ? firstInfo.weapons.map(w => w.name).join(' / ') : '不明なブキ';
                
                // 修正箇所: URLから画像を取得
                const stageImageUrl = getCoopImageURL(stageName, 'stage');
                const bossIconUrl = getCoopImageURL(bossName, 'boss');

                embed = new EmbedBuilder()
                    .setTitle(`💰 ${modeTitle} 💰`)
                    .setDescription(`**場所:** ${stageName}\n**ブキ:** ${weapons}\n**期間 (JST):** ${timeRange}`)
                    .addFields({ name: 'オオモノシャケ', value: bossName, inline: false })
                    .setColor(0xFF4500);

                // ステージ画像 (setImage)
                if (stageImageUrl) {
                    embed.setImage(stageImageUrl);
                }

                // ボスアイコン (setThumbnail)
                if (bossIconUrl) {
                    embed.setThumbnail(bossIconUrl);
                }

                // ローカルファイルの添付は不要になったため、attachments関連の処理を削除またはコメントアウト
                // const stageFileName = `${stageName}.png`;
                // const stageFilePath = path.join(process.cwd(), 'images', 'サーモンラン', stageFileName);
                // const stageAttachment = tryAttachImage(stageFilePath, stageFileName);
                // if (stageAttachment) attachments.push(stageAttachment);
                // if (stageAttachment) embed.setImage(`attachment://${stageFileName}`);

                // const bossFileName = `${bossName}.png`;
                // const bossFilePath = path.join(process.cwd(), 'images', 'サーモンラン', bossFileName);
                // const bossAttachment = tryAttachImage(bossFilePath, bossFileName);
                // if (bossAttachment) attachments.push(bossAttachment);
                // if (bossAttachment) embed.setThumbnail(`attachment://${bossFileName}`);

            } else {
                const stageNames = firstInfo.stages ? firstInfo.stages.map(s => s.name).join(' & ') : (firstInfo.stage ? firstInfo.stage.name : '不明');
                const ruleName = firstInfo.rule ? firstInfo.rule.name : '不明';

                embed = new EmbedBuilder()
                    .setTitle(`🦑 ${modeTitle} (${ruleName}) 🦑`)
                    .setDescription(`**${stageNames}**`)
                    .addFields(
                        { name: 'ルール', value: ruleName, inline: true },
                        { name: '期間 (JST)', value: timeRange, inline: true }
                    )
                    .setColor(0x0099FF);

                if (firstInfo.stages && firstInfo.stages.length >= 2) {
                    const fileName = `${firstInfo.stages[0].name}_${firstInfo.stages[1].name}.png`;
                    const filePath = path.join(process.cwd(), 'stages', fileName);
                    const attachment = tryAttachImage(filePath, fileName);
                    if (attachment) attachments.push(attachment);
                    if (attachment) embed.setImage(`attachment://${fileName}`);
                }
            }

            // サーモンランではattachmentsが空になるが、他のモードではまだローカル画像を使う可能性があるため、filesオプションは残す
            await interaction.editReply({ embeds: [embed], files: attachments });

        } catch (error) {
            console.error('APIリクエストまたはファイル処理中にエラーが発生しました:', error);
            const status = error.response ? error.response.status : 'N/A';
            await interaction.editReply(`ステージ情報APIの取得または画像ファイルの処理に失敗しました。\n(エラーコード: ${status} またはネットワーク/ファイル問題)`);
        }
    },
};