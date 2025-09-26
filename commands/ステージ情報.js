const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// モードアイコン
const MODE_ICONS = {
  regular: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/regular.png',
  bankara: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/bankara.png',
  x: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/x.png',
  event: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/event.png',
  fest: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/fest.png',
  salmon: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/salmon.png'
};

// ルールサムネイル
const RULE_THUMBNAILS = {
  AREA: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/area.png',
  LOFT: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/loft.png',
  GOAL: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/goal.png',
  CLAM: 'https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/mode/clam.png'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ステージ情報')
    .setDescription('現在のステージ情報を表示します'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const response = await fetch('https://spla3.yuu26.com/api/schedule');
      const data = await response.json();

      const embeds = [];

      // 汎用関数：ステージ画像URL作成
      const getStageImageURL = (stages) => {
        if (!stages || stages.length === 0) return null;
        if (stages.length === 1) {
          return `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(stages[0].name)}.png`;
        } else if (stages.length === 2) {
          return `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/stages/${encodeURIComponent(stages[0].name)}_${encodeURIComponent(stages[1].name)}.png`;
        }
        return null;
      };

      // 汎用関数：マッチ共通処理
      const createMatchEmbed = (info, modeName, iconURL) => {
        const start = new Date(info.start_time);
        const end = new Date(info.end_time);

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setAuthor({ name: modeName, iconURL })
          .setDescription(`${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')} ~ ${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`);

        // サムネイル設定
        if (modeName === 'レギュラーマッチ') {
          embed.setThumbnail(MODE_ICONS.regular);
        } else {
          const thumbnailURL = RULE_THUMBNAILS[info.rule.key];
          if (thumbnailURL) embed.setThumbnail(thumbnailURL);
        }

        // ステージ画像
        const stageImageURL = getStageImageURL(info.stages);
        if (stageImageURL) {
          embed.setImage(stageImageURL);
        }

        return embed;
      };

      // レギュラーマッチ
      if (data.result.regular[0]) {
        embeds.push(createMatchEmbed(data.result.regular[0], 'レギュラーマッチ', MODE_ICONS.regular));
      }

      // バンカラマッチ（オープン/チャレンジ）
      if (data.result.bankara_open[0]) {
        embeds.push(createMatchEmbed(data.result.bankara_open[0], 'バンカラマッチ (オープン)', MODE_ICONS.bankara));
      }
      if (data.result.bankara_challenge[0]) {
        embeds.push(createMatchEmbed(data.result.bankara_challenge[0], 'バンカラマッチ (チャレンジ)', MODE_ICONS.bankara));
      }

      // Xマッチ
      if (data.result.x[0]) {
        embeds.push(createMatchEmbed(data.result.x[0], 'Xマッチ', MODE_ICONS.x));
      }

      // フェスマッチ
      if (data.result.fest[0]) {
        embeds.push(createMatchEmbed(data.result.fest[0], 'フェスマッチ', MODE_ICONS.fest));
      }

      // イベントマッチ
      const eventInfo = data.result.event[0];
      const now = new Date();
      if (eventInfo) {
        if (!eventInfo.rule || !eventInfo.stages) {
          // 未開催
          const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setAuthor({ name: 'イベントマッチ', iconURL: MODE_ICONS.event })
            .setDescription('現在イベントマッチは開催していません。');
          embeds.push(embed);
        } else {
          const start = new Date(eventInfo.start_time);
          const end = new Date(eventInfo.end_time);

          if (now < start) {
            // まだ開始前 → 次回予定を出力
            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setAuthor({ name: 'イベントマッチ', iconURL: MODE_ICONS.event })
              .setDescription(`次回は ${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')} ~ ${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')} に開催予定です。`);
            embeds.push(embed);
          } else {
            // 開催中
            embeds.push(createMatchEmbed(eventInfo, 'イベントマッチ', MODE_ICONS.event));
          }
        }
      }

      // サーモンラン
      if (data.result.coop[0]) {
        const info = data.result.coop[0];
        const start = new Date(info.start_time);
        const end = new Date(info.end_time);

        const embed = new EmbedBuilder()
          .setColor(0xf25555)
          .setAuthor({ name: 'サーモンラン', iconURL: MODE_ICONS.salmon })
          .setDescription(`${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')} ~ ${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`);

        // ステージ画像
        const stageImageURL = getStageImageURL(info.stages);
        if (stageImageURL) embed.setImage(stageImageURL);

        // ボスアイコン
        if (info.boss && info.boss.name) {
          const bossURL = `https://raw.githubusercontent.com/irisufn/images_matitan/refs/heads/main/images/%E3%82%B5%E3%83%BC%E3%83%A2%E3%83%B3%E3%83%A9%E3%83%B3/${encodeURIComponent(info.boss.name)}.png`;
          embed.addFields({ name: '出現ボス', value: info.boss.name, inline: true });
          embed.setThumbnail(bossURL);
        }

        embeds.push(embed);
      }

      await interaction.editReply({ embeds });
    } catch (error) {
      console.error('API取得またはEmbed処理中にエラー:', error);
      await interaction.editReply('ステージ情報を取得できませんでした。');
    }
  }
};
