// commands/ステージ情報.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const Canvas = require('canvas');
const path = require('path');

// モード正規化
const MODE_MAP = {
  'regular': 'regular',
  'bankara-open': 'bankara-open',
  'bankara-challenge': 'bankara-challenge',
  'x': 'x',
  'event': 'event',
  'fest': 'fest',
  'fest-challenge': 'fest-challenge',
  'salmon': 'coop-grouping',
  'salmon-contest': 'coop-grouping-team-contest'
};

// アイコンパス
const MODE_ICONS = {
  'regular': 'Images/regular.png',
  'bankara-open': 'Images/bankara.png',
  'bankara-challenge': 'Images/bankara.png',
  'x': 'Images/x.png',
  'event': 'Images/event.png',
  'fest': 'Images/fest.png',
  'fest-challenge': 'Images/fest.png',
  'coop-grouping': 'Images/salmon.png',
  'coop-grouping-team-contest': 'Images/salmon.png'
};

const RULE_THUMBNAILS = {
  'TURF_WAR': 'Images/regular.png',
  'AREA': 'Images/area.png',
  'LOFT': 'Images/loft.png',
  'GOAL': 'Images/goal.png',
  'CLAM': 'Images/clam.png'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ステージ情報')
    .setDescription('スプラトゥーン3のステージ情報を取得します')
    .addStringOption(option =>
      option.setName('モード')
        .setDescription('取得するモード')
        .setRequired(true)
        .addChoices(
          { name: 'レギュラー', value: 'regular' },
          { name: 'バンカラオープン', value: 'bankara-open' },
          { name: 'バンカラチャレンジ', value: 'bankara-challenge' },
          { name: 'Xマッチ', value: 'x' },
          { name: 'イベント', value: 'event' },
          { name: 'フェスオープン', value: 'fest' },
          { name: 'フェスチャレンジ', value: 'fest-challenge' },
          { name: 'サーモンラン', value: 'salmon' },
          { name: 'バイトチームコンテスト', value: 'salmon-contest' }
        ))
    .addStringOption(option =>
      option.setName('スケジュール')
        .setDescription('取得する時間（now / next / schedule）')
        .setRequired(false)
        .addChoices(
          { name: '現在', value: 'now' },
          { name: '次', value: 'next' },
          { name: '予定', value: 'schedule' }
        )),
  
  async execute(interaction) {
    await interaction.deferReply();

    const modeInput = interaction.options.getString('モード');
    const mode = MODE_MAP[modeInput];
    const schedule = interaction.options.getString('スケジュール') || 'now';

    if (!mode) return interaction.editReply('指定されたモードは対応していません。');
    if ((mode === 'event' || mode === 'coop-grouping-team-contest') && schedule !== 'schedule') {
      return interaction.editReply('このモードは「予定(schedule)」のみ対応しています。');
    }

    const url = `https://spla3.yuu26.com/api/${mode}/${schedule}`;
    let data;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'DiscordBot/1.0 (contact@yourdomain.com)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      return interaction.editReply(`API取得中にエラーが発生しました: ${err.message}`);
    }

    const results = data.results || data.result?.[mode] || [];
    if (!Array.isArray(results) || !results.length) {
      return interaction.editReply('ステージ情報が見つかりませんでした。');
    }

    const embeds = [];

    for (const item of results) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: modeInput,
          iconURL: `attachment://${path.basename(MODE_ICONS[mode])}`
        })
        .setTitle(item.is_fest ? 'フェスマッチ開催中' : item.rule?.name || 'ステージ情報')
        .setDescription(item.event?.desc || '')
        .addFields(
          ...(item.stages?.map((s, i) => ({ name: `ステージ${i + 1}`, value: s.name, inline: true })) || [])
        )
        .setFooter({ text: `開始: ${item.start_time} | 終了: ${item.end_time}` });

      // サムネイル
      if (item.rule?.key && RULE_THUMBNAILS[item.rule.key]) {
        embed.setThumbnail(`attachment://${path.basename(RULE_THUMBNAILS[item.rule.key])}`);
      }

      // ステージ画像結合
      if (item.stages?.length === 2 && item.stages[0].image && item.stages[1].image) {
        try {
          const canvas = Canvas.createCanvas(640, 320);
          const ctx = canvas.getContext('2d');
          const img1 = await Canvas.loadImage(item.stages[0].image);
          const img2 = await Canvas.loadImage(item.stages[1].image);
          ctx.drawImage(img1, 0, 0, 320, 320);
          ctx.drawImage(img2, 320, 0, 320, 320);

          await interaction.editReply({
            embeds: [embed],
            files: [
              { attachment: path.resolve(MODE_ICONS[mode]), name: path.basename(MODE_ICONS[mode]) },
              { attachment: path.resolve(RULE_THUMBNAILS[item.rule?.key] || MODE_ICONS[mode]), name: path.basename(RULE_THUMBNAILS[item.rule?.key] || MODE_ICONS[mode]) },
              { attachment: canvas.toBuffer(), name: 'stages.png' }
            ]
          });
          continue;
        } catch (err) {
          console.error('Canvasエラー:', err);
        }
      } else if (item.stages?.[0]?.image) {
        embed.setImage(item.stages[0].image);
      }

      embeds.push(embed);
    }

    if (embeds.length) {
      await interaction.editReply({
        embeds,
        files: [
          { attachment: path.resolve(MODE_ICONS[mode]), name: path.basename(MODE_ICONS[mode]) }
        ]
      });
    } else {
      await interaction.editReply('ステージ情報が見つかりませんでした。');
    }
  }
};
