const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  getVoiceConnection,
} = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('BOTがVCに参加して音声を再生します')
    .addStringOption(option =>
      option
        .setName('url')
        .setDescription('再生する音声ファイルのURL (mp3/ogg/webm推奨)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const url = interaction.options.getString('url');
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: 'まずボイスチャンネルに参加してください。',
        ephemeral: true,
      });
    }

    // 既存の接続を切断（重複防止）
    const existingConnection = getVoiceConnection(interaction.guild.id);
    if (existingConnection) existingConnection.destroy();

    // 接続
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    await interaction.reply({
      content: `🔊 接続しました。3秒後に音声を再生します…`,
    });

    // 3秒待機
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 音声リソース作成
    const resource = createAudioResource(url, { inlineVolume: true });
    resource.volume.setVolume(0.5); // 音量50%

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    player.play(resource);
    connection.subscribe(player);

    // 再生状態ログ
    player.on(AudioPlayerStatus.Playing, () => {
      interaction.followUp(`🎶 再生開始: ${url}`);
    });

    // 再生終了後に切断
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    // エラー処理
    player.on('error', error => {
      console.error(`音声再生中にエラー: ${error.message}`);
      interaction.followUp({ content: '❌ 音声の再生に失敗しました。' });
      connection.destroy();
    });
  },
};
