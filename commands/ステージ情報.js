const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ステージ情報')
    .setDescription('現在のスプラ3ステージ情報を表示します'),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return; // 念のため追加
    await interaction.deferReply();

    try {
      const res = await fetch('https://spla3.yuu26.com/api/schedule', {
        headers: { 'User-Agent': 'DiscordBot/1.0 (contact: @your_twitter)' }
      });
      if (!res.ok) throw new Error('APIの取得に失敗しました');
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setTitle('スプラ3 ステージ情報')
        .setColor(0x1abc9c)
        .setTimestamp();

      for (const schedule of data.results.slice(0, 3)) { // 最新3件だけ例
        if (schedule.is_fest) {
          embed.addFields({ name: 'フェス情報', value: '現在フェス開催中です' });
        } else {
          const stages = schedule.stages.map(s => s.name).join(' / ');
          embed.addFields({
            name: schedule.rule.name,
            value: `${stages}\n${new Date(schedule.start_time).toLocaleString()} ～ ${new Date(schedule.end_time).toLocaleString()}`,
          });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('コマンド実行中にエラーが発生しました');
      } else {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました', ephemeral: true });
      }
    }
  }
};
