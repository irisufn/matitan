const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const GEAR_JSON_URL = 'https://splatoon3.ink/data/gear.json';
const LOCALE_JSON_URL = 'https://splatoon3.ink/data/locale/ja-JP.json';

const BRAND_MAP = {
    'amiibo': 'amiibo',
    'KOG': 'KOG',
    'Ironic': 'アイロニック',
    'Zink': 'Zink',
    'Cuttlegear': 'アタリメイド',
    'Tentatek': 'アロメ',
    'Zekko': 'エゾッコ',
    'Krak-On': 'クラーゲス',
    'Inkline': 'シグレニ',
    'Splash Mob': 'ジモン',
    'SquidForce': 'バトロイカ',
    'Famitsu': 'ファミ通',
    'Forge': 'フォーリマ',
    'Skalop': 'ホタックス',
    'Firefin': 'ホッコリー',
    'Takoroka': 'ヤコ',
    'Rockenberg': 'ロッケンベルグ'
};

const TYPE_MAP = {
    HeadGear: 'アタマ',
    ClothingGear: 'フク',
    ShoesGear: 'クツ'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ゲソタウン')
        .setDescription('ゲソタウンの販売情報を表示します')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('販売タイプを選択')
                .setRequired(true)
                .addChoices(
                    { name: '通常販売', value: 'normal' },
                    { name: 'ピックアップ', value: 'pickup' }
                )
        ),

    async execute(interaction) {
        try {
            // 1回だけ deferReply
            await interaction.deferReply();

            const type = interaction.options.getString('type');

            const gearRes = await fetch(GEAR_JSON_URL);
            const gearData = await gearRes.json();

            const localeRes = await fetch(LOCALE_JSON_URL);
            const localeData = await localeRes.json();

            const gearLocale = localeData.gear || {};

            let embed = new EmbedBuilder().setTitle('ゲソタウン情報');

            if (type === 'normal') {
                const items = gearData.limitedGears;
                for (const item of items) {
                    const gear = item.gear;
                    embed.addFields({
                        name: `${gearLocale[gear.__splatoon3ink_id]?.name || gear.name} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                        value:
                            `価格: ${item.price}\n` +
                            `販売終了: ${new Date(item.saleEndTime).toLocaleString()}\n` +
                            `メインギアパワー: ${gearLocale[gear.primaryGearPower.__splatoon3ink_id]?.name || gear.primaryGearPower.name}\n` +
                            `ブランド: ${BRAND_MAP[gear.brand.name] || gear.brand.name}`
                    });
                }
            } else if (type === 'pickup') {
                const pickup = gearData.data.gesotown.pickupBrand;
                for (const item of pickup.brandGears) {
                    const gear = item.gear;
                    embed.addFields({
                        name: `${gearLocale[gear.__splatoon3ink_id]?.name || gear.name} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                        value:
                            `価格: ${item.price}\n` +
                            `販売終了: ${new Date(item.saleEndTime).toLocaleString()}\n` +
                            `メインギアパワー: ${gearLocale[gear.primaryGearPower.__splatoon3ink_id]?.name || gear.primaryGearPower.name}\n` +
                            `ブランド: ${BRAND_MAP[gear.brand.name] || gear.brand.name}`
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            // すでに defer / reply 済みなら editReply、それ以外なら reply
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'エラーが発生しました。', ephemeral: true });
            } else {
                await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
            }
        }
    }
};
