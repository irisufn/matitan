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

        try {
            // APIからデータを取得
            const gearRes = await fetch(GEAR_JSON_URL);
            const gearData = await gearRes.json();

            const localeRes = await fetch(LOCALE_JSON_URL);
            const locale = await localeRes.json();

            let embeds = [];

            const processItem = (item) => {
                const gear = item.gear;

                // ギア名（locale.gear）
                const gearName = locale.gear[gear.__splatoon3ink_id]?.name || '不明';

                // 🌟 修正されたメインギアパワーの取得ロジック
                // gear.primaryGearPowerが存在し、そのIDがあれば、locale.abilityから日本語名を取得
                const primaryGearName = gear.primaryGearPower
                    ? locale.ability[gear.primaryGearPower.__splatoon3ink_id]?.name || '不明'
                    : 'なし';

                // ブランド名
                const brandName = BRAND_MAP[gear.brand.name] || gear.brand.name;

                return {
                    name: `${gearName} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                    value:
                        `価格: ${item.price}ゲソ\n` +
                        `販売終了: <t:${Math.floor(new Date(item.saleEndTime).getTime() / 1000)}:F>\n` +
                        `メインギアパワー: **${primaryGearName}**\n` + // メインギアパワーを強調
                        `ブランド: ${brandName}`
                };
            };

            //---

            if (type === 'normal') {
                // 通常販売 → limitedGears
                const items = gearData.data.gesotown.limitedGears || [];
                if (items.length === 0) {
                    return interaction.editReply('現在、通常販売のギアはありません。');
                }

                const embed = new EmbedBuilder()
                    .setTitle('ゲソタウン - 通常販売ギア')
                    .setColor('#11edaa')
                    .setDescription('各ギアは4時間ごとに更新されます。');

                // ギアの画像（通常販売の最初のギアの画像をサムネイルに設定）
                if (items[0].gear.image?.url) {
                    embed.setThumbnail(items[0].gear.image.url);
                }

                embed.addFields(items.map(processItem));
                embeds.push(embed);

            //---

            } else if (type === 'pickup') {
                // ピックアップ販売 → pickupBrand.brandGears
                const pickup = gearData.data.gesotown.pickupBrand;
                if (!pickup || !pickup.brandGears || pickup.brandGears.length === 0) {
                    return interaction.editReply('現在、ピックアップ販売はありません。');
                }

                const brandNameJp = BRAND_MAP[pickup.brand.name] || pickup.brand.name;

                // ピックアップの得意ギアパワー名を取得
                const brandGearPowerId = pickup.brand?.usualGearPower?.__splatoon3ink_id;
                const brandGearPowerName = brandGearPowerId
                    ? locale.ability[brandGearPowerId]?.name || '不明'
                    : 'なし';

                const embed = new EmbedBuilder()
                    .setTitle(`ゲソタウン - ピックアップ: ${brandNameJp}`)
                    .setDescription(`得意ギアパワー: **${brandGearPowerName}**`) // 得意ギアパワーを追記
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

            //---
            
            await interaction.editReply({ embeds });

        } catch (error) {
            console.error('ゲソタウン情報の取得中にエラーが発生しました:', error);
            await interaction.editReply('ゲソタウン情報の取得中にエラーが発生しました。APIが利用可能か確認してください。');
        }
    }
};