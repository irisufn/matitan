const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// BASE_URLとUSER_AGENTは適切に設定してください
const BASE_URL = 'https://spla3.yuu26.com/api/';
const USER_AGENT = 'SplaBot/1.0 (Contact: your_discord_username#0000)'; // あなたの連絡先に置き換えてください

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

const formatTime = (timeString) => {
    const date = new Date(timeString);
    // JSTに変換 (UTC+9)
    const jstDate = new Date(date.getTime());
    return jstDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
};

// 画像をAttachmentとして作成するヘルパー関数
const tryAttachImage = (filePath) => {
    if (fs.existsSync(filePath)) {
        // ファイル名だけを抽出してAttachmentを作成
        return new AttachmentBuilder(filePath);
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
        // 先に応答を保留
        await interaction.deferReply();

        try {
            const modeValue = interaction.options.getString('モード');
            const timeValue = interaction.options.getString('時間');
            const modeData = MODES.find(m => m.value === modeValue);
            const modeTitle = modeData ? modeData.title : '不明なモード';

            let apiUrl = '';
            // APIのエンドポイントをモードに応じて決定
            if (modeValue.startsWith('coop-grouping') || modeValue === 'event') {
                apiUrl = `${BASE_URL}${modeValue}/schedule`;
            } else {
                apiUrl = `${BASE_URL}${modeValue}/${timeValue}`;
            }

            const response = await axios.get(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
            
            // `timeValue` に応じて取得するデータを調整
            let scheduleData;
            if (timeValue === 'now') {
                scheduleData = response.data.results?.[0];
            } else { // 'next'
                scheduleData = response.data.results?.[1];
            }

            if (!scheduleData) {
                await interaction.editReply(`現在、**${modeTitle}** の${timeValue === 'now' ? '現在' : '次'}の情報はありません。`);
                return;
            }

            const isCoopMode = modeValue.startsWith('coop-grouping');
            const embed = new EmbedBuilder();
            const attachments = [];

            const timeRange = `${formatTime(scheduleData.start_time)} 〜 ${formatTime(scheduleData.end_time)}`;

            if (isCoopMode) {
                const stageName = scheduleData.stage?.name || '不明なステージ';
                const bossName = scheduleData.boss?.name || '不明なオオモノシャケ';
                const weapons = scheduleData.weapons?.map(w => w.name).join(' / ') || '不明なブキ';

                embed.setTitle(`💰 ${modeTitle} 💰`)
                    .setDescription(`**場所:** ${stageName}\n**ブキ:** ${weapons}\n**期間 (JST):** ${timeRange}`)
                    .addFields({ name: 'オオモノシャケ', value: bossName, inline: false })
                    .setColor(0xFF4500);

                // ステージ画像
                const stageImageFile = `${stageName}.png`;
                const stageImagePath = path.join(process.cwd(), 'images', 'サーモンラン', stageImageFile);
                const stageAttachment = tryAttachImage(stageImagePath);
                if (stageAttachment) {
                    attachments.push(stageAttachment);
                    embed.setImage(`attachment://${stageImageFile}`);
                }

                // ボス画像 (Thumbnail)
                const bossImageFile = `${bossName}.png`;
                const bossImagePath = path.join(process.cwd(), 'images', 'サーモンラン', bossImageFile);
                const bossAttachment = tryAttachImage(bossImagePath);
                if (bossAttachment) {
                    attachments.push(bossAttachment);
                    embed.setThumbnail(`attachment://${bossImageFile}`);
                }
            } else { // 対戦モード
                const stageNames = scheduleData.stages?.map(s => s.name).join(' & ') || '不明';
                const ruleName = scheduleData.rule?.name || '不明';

                embed.setTitle(`🦑 ${modeTitle} (${ruleName}) 🦑`)
                    .setDescription(`**${stageNames}**`)
                    .addFields(
                        { name: 'ルール', value: ruleName, inline: true },
                        { name: '期間 (JST)', value: timeRange, inline: true }
                    )
                    .setColor(0x0099FF);

                if (scheduleData.stages && scheduleData.stages.length > 0) {
                    // 1枚目のステージ画像をメイン画像として設定
                    const stageImageFile = `${scheduleData.stages[0].name}.png`;
                    const stageImagePath = path.join(process.cwd(), 'images', 'ステージ', stageImageFile); // 'stages' -> 'images/ステージ'など実際のパスに
                    const stageAttachment = tryAttachImage(stageImagePath);
                    if (stageAttachment) {
                        attachments.push(stageAttachment);
                        embed.setImage(`attachment://${stageImageFile}`);
                    }
                }
            }

            // editReplyにembedsとfilesを渡す
            await interaction.editReply({ embeds: [embed], files: attachments });

        } catch (error) {
            console.error('コマンド実行中にエラーが発生しました:', error);

            // エラーの内容に応じてユーザーへのメッセージを分岐
            let errorMessage = '情報の取得中にエラーが発生しました。';
            if (error.isAxiosError) {
                errorMessage = `ステージ情報APIへの接続に失敗しました。(ステータス: ${error.response?.status || 'N/A'})`;
            } else if (error.code === 10062) { // Unknown Interaction
                // このエラーがログに出た場合、基本的にはコンソールで確認するしかない
                // ユーザーには一般的なエラーメッセージを表示
                console.error('Unknown Interactionエラーをキャッチしました。応答が15分を超えた可能性があります。');
                errorMessage = '応答の有効期限が切れました。もう一度コマンドをお試しください。';
            }
            
            // interactionがまだ返信可能な状態か確認してからeditReplyを試みる
            if (!interaction.replied && !interaction.deferred) {
                // まだ何も応答していない場合（通常はdeferReplyがあるのでここには来ないはず）
                await interaction.reply({ content: errorMessage, ephemeral: true });
            } else {
                 await interaction.editReply({ content: errorMessage, embeds: [], files: [] });
            }
        }
    },
};