const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const GEAR_JSON_URL = 'https://splatoon3.ink/data/gear.json';
const LOCALE_JSON_URL = 'https://splatoon3.ink/data/locale/ja-JP.json';

const BRAND_MAP = {
    amiibo: 'amiibo',
    KOG: 'KOG',
    アイロニック: 'Ironic',
    Zink: 'Zink',
    アタリメイド: 'Cuttlegear',
    アロメ: 'Tentatek',
    エゾッコ: 'Zekko',
    クラーゲス: 'Krak-On',
    シグレニ: 'Inkline',
    ジモン: 'Splash Mob',
    バトロイカ: 'SquidForce',
    ファミ通: 'Famitsu',
    フォーリマ: 'Forge',
    ホタックス: 'Skalop',
    ホッコリー: 'Firefin',
    ヤコ: 'Takoroka',
    ロッケンベルグ: 'Rockenberg'
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
        await interaction.deferReply();

        const type = interaction.options.getString('type');

        // JSON取得
        const gearRes = await fetch(GEAR_JSON_URL);
        const gearData = await gearRes.json();
        const localeRes = await fetch(LOCALE_JSON_URL);
        const locale = await localeRes.json();

        let embed = new EmbedBuilder()
            .setTitle('ゲソタウン情報');

        if (type === 'normal') {
            const items = gearData.limitedGears;
            for (const item of items) {
                const gear = item.gear;
                embed.addFields({
                    name: `${locale[gear.__splatoon3ink_id] || gear.name} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                    value:
                        `価格: ${item.price}\n` +
                        `販売終了: ${new Date(item.saleEndTime).toLocaleString()}\n` +
                        `メインギアパワー: ${locale[gear.primaryGearPower.__splatoon3ink_id] || gear.primaryGearPower.name}\n` +
                        `ブランド: ${BRAND_MAP[gear.brand.name] || gear.brand.name}`
                });
            }
        } else if (type === 'pickup') {
            const pickup = gearData.data.gesotown.pickupBrand;
            // 通常ブランドギア
            for (const item of pickup.brandGears) {
                const gear = item.gear;
                embed.addFields({
                    name: `${locale[gear.__splatoon3ink_id] || gear.name} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                    value:
                        `価格: ${item.price}\n` +
                        `販売終了: ${new Date(item.saleEndTime).toLocaleString()}\n` +
                        `メインギアパワー: ${locale[gear.primaryGearPower.__splatoon3ink_id] || gear.primaryGearPower.name}\n` +
                        `ブランド: ${BRAND_MAP[gear.brand.name] || gear.brand.name}`
                });
            }
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
