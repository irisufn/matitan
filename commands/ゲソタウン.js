const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const GEAR_JSON_URL = 'https://splatoon3.ink/data/gear.json';
const LOCALE_JSON_URL = 'https://splatoon3.ink/data/locale/ja-JP.json';

const BRAND_MAP = {
    'Zink': 'アイロニック',
    'Cuttlegear': 'アタリメイド',
    'Annaki': 'アナアキ',
    'amiibo': 'amiibo',
    'Tentatek': 'アロメ',
    'Zekko': 'エゾッコ',
    'Z+F': 'エゾッコリー',
    'Enperry': 'エンペリー',
    'Grizzco': 'クマサン商会',
    'Krak-On': 'クラーゲス',
    'Inkline': 'シグレニ',
    'Emberz': 'シチリン',
    'Splash Mob': 'ジモン',
    'Toni Kensa': 'タタキケンサキ',
    'SquidForce': 'バトロイカ',
    'Barazushi': 'バラズシ',
    'Forge': 'フォーリマ',
    'Skalop': 'ホタックス',
    'Firefin': 'ホッコリー',
    'Rockenberg': 'ロッケンベルグ',
    'Takoroka': 'ヤコ'
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

        const gearRes = await fetch(GEAR_JSON_URL);
        const gearData = await gearRes.json();

        const localeRes = await fetch(LOCALE_JSON_URL);
        const locale = await localeRes.json();

        let embeds = [];

        const processItem = (item) => {
            const gear = item.gear;

            // locale経由で日本語化
            const gearName = locale.gear[gear.__splatoon3ink_id]?.name || '不明';
            const primaryGearName = gear.primaryGearPower
                ? locale.gear[gear.primaryGearPower.__splatoon3ink_id]?.name || 'なし'
                : 'なし';
            const brandName = BRAND_MAP[gear.brand.name] || gear.brand.name;

            return {
                name: `${gearName} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                value:
                    `価格: ${item.price}ゲソ\n` + // ← 単位を「ゲソ」に変更
                    `販売終了: <t:${Math.floor(new Date(item.saleEndTime).getTime() / 1000)}:F>\n` +
                    `メインギアパワー: ${primaryGearName}\n` +
                    `ブランド: ${brandName}`
            };
        };

        if (type === 'normal') {
            const items = gearData.data.gesotown.limitedGears || [];
            if (items.length === 0) {
                return interaction.editReply('現在、通常販売のギアはありません。');
            }

            const embed = new EmbedBuilder()
                .setTitle('ゲソタウン - 通常販売ギア')
                .setColor('#11edaa');

            embed.addFields(items.map(processItem));
            embeds.push(embed);

        } else if (type === 'pickup') {
            const pickup = gearData.data.gesotown.pickupBrand;
            if (!pickup || !pickup.brandGears || pickup.brandGears.length === 0) {
                return interaction.editReply('現在、ピックアップ販売はありません。');
            }

            const embed = new EmbedBuilder()
                .setTitle(`ゲソタウン - ピックアップ: ${BRAND_MAP[pickup.brand.name] || pickup.brand.name}`)
                .setColor('#ed751f');

            // ピックアップの大きな画像
            if (pickup.image?.url) {
                embed.setImage(pickup.image.url);
            }

            // ブランドの得意ギアパワーのアイコンをサムネイルに
            if (pickup.brand?.usualGearPower?.image?.url) {
                embed.setThumbnail(pickup.brand.usualGearPower.image.url);
            }

            embed.addFields(pickup.brandGears.map(processItem));
            embeds.push(embed);
        }

        await interaction.editReply({ embeds });
    }
};
