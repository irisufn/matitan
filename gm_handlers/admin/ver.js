// gm_handlers/admin/ver.js

const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, version } = require('discord.js');

module.exports = async (client, message, args) => {
  try {
    // 管理者IDチェック
    const adminPath = path.join(__dirname, '../../data/admin.json');
    let adminList = [];
    try {
      adminList = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
    } catch (e) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ エラー')
        .setDescription('管理者リストの読み込みに失敗しました')
        .setTimestamp();
      return message.channel.send({ embeds: [errorEmbed] });
    }

    if (!adminList.includes(message.author.id)) {
      const noPermsEmbed = new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('⚠️ 権限エラー')
        .setDescription('管理者権限がありません')
        .setTimestamp();
      return message.channel.send({ embeds: [noPermsEmbed] });
    }

    // 正常時のEmbed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`現在の discord.js は v${version} です。`)
      .setFooter({ text: `Node.js ${process.version}` })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    // 予期しないエラーもEmbed化
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ 実行エラー')
      .setDescription(`エラー内容: \`\`\`${err.message}\`\`\``)
      .setTimestamp();
    await message.channel.send({ embeds: [errorEmbed] });
  }
};
