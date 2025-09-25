const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ステージ情報')
    .setDescription('現在のスプラ3ステージ情報を表示します'),

  async execute(client, interaction) {
    try {
      await interaction.deferReply(); // 処理中表示

      const res = await fetch('https://splatoon3.ink/data/schedules.json');
      const data = await res.json();

      if (!data) throw new Error('データ取得失敗');

      const regular = data.regular;
      const gachi = data.gachi;
      const league = data.league;

      const embed = new EmbedBuilder()
        .setTitle('スプラ3 現在のステージ情報')
        .setColor('#00FFFF')
        .addFields(
          { name: 'ナワバリ', value: `${regular[0].stage_a.name} / ${regular[0].stage_b.name}`, inline: false },
          { name: 'ガチマッチ', value: `${gachi[0].rule} - ${gachi[0].stage_a.name} / ${gachi[0].stage_b.name}`, inline: false },
          { name: 'リーグマッチ', value: `${league[0].rule} - ${league[0].stage_a.name} / ${league[0].stage_b.name}`, inline: false },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
      } else {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
      }
    }
  }
};
