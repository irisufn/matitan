const path = require('node:path');
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
    .setDescription('BOTがVCに参加してローカル音声を再生します'),

  async execute(interaction) {
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
      content: `🔊 接続しました。5秒後に音声を再生します…`,
    });

    // 5秒待機
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 🔊 プロジェクト内 sound フォルダの音声ファイルを指定
    const audioFilePath = path.join(__dirname, '../sound/Vain_F_minor__bpm_53.mp3');

    // 音声リソース作成
    const resource = createAudioResource(audioFilePath, { inlineVolume: true });
    resource.volume.setVolume(0.5); // 音量50%

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    player.play(resource);
    connection.subscribe(player);

    // 再生開始
    player.on(AudioPlayerStatus.Playing, () => {
      interaction.followUp(`🎶 再生開始: Vain_F_minor__bpm_53.mp3`);
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
