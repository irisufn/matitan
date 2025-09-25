const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch'); // node-fetch v2/v3 を使用

const RULE_NAMES = {
  TURF_WAR: 'ナワバリバトル',
  AREA: 'ガチエリア',
  LOFT: 'ガチヤグラ',
  GOAL: 'ガチホコバトル',
  CLAM: 'ガチアサリ'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ステージ情報')
    .setDescription('現在のスプラ3ステージ情報を表示します'),
  
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await fetch('https://spla3.yuu26.com/api/schedule', {
        headers: {
          'User-Agent': 'Ikabot/1.0(twitter@youraccount) IkaGirl/2.0(https://example.com/)'
        }
      });

      if (!res.ok) return interaction.editReply('API 取得に失敗しました。');

      const data = await res.json();

      const embed = new EmbedBuilder()
        .setTitle('スプラ3 現在のステージ情報')
        .setColor(0x1abc9c)
        .setTimestamp();

      // results 配列の最初の要素だけ表示（必要に応じてループ可能）
      const current = data.results[0];

      if (current.is_fest) {
        embed.addFields({
          name: 'フェス開催中',
          value: `開始: <t:${Math.floor(new Date(current.start_time).getTime() / 1000)}:F>\n終了: <t:${Math.floor(new Date(current.end_time).getTime() / 1000)}:F>`
        });

        if (current.is_tricolor && current.tricolor_stages) {
          embed.addFields({
            name: 'トリカラステージ',
            value: current.tricolor_stages.map(s => s.name).join(' / ')
          });
        } else if (current.stages) {
          embed.addFields({
            name: 'ステージ',
            value: current.stages.map(s => s.name).join(' / ')
          });
        }
      } else if (current.rule && current.stages) {
        embed.addFields(
          { name: 'ルール', value: RULE_NAMES[current.rule.key] || current.rule.name, inline: true },
          { name: 'ステージ', value: current.stages.map(s => s.name).join(' / '), inline: true },
          {
            name: '時間',
            value: `<t:${Math.floor(new Date(current.start_time).getTime() / 1000)}:F> 〜 <t:${Math.floor(new Date(current.end_time).getTime() / 1000)}:F>`
          }
        );
      } else {
        embed.setDescription('現在利用可能なステージ情報はありません。');
      }

      // ステージ画像を添付（1枚目のステージ）
      if (current.stages && current.stages[0] && current.stages[0].image) {
        embed.setThumbnail(current.stages[0].image);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      interaction.editReply('ステージ情報の取得中にエラーが発生しました。');
    }
  }
};
