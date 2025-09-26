const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

        const gearRes = await fetch(GEAR_JSON_URL);
        const gearData = await gearRes.json();

        const localeRes = await fetch(LOCALE_JSON_URL);
        const locale = await localeRes.json();

        let embeds = [];

        if (type === 'normal') {
            const items = gearData.data.gesotown.limitedGears || [];
            if (items.length === 0) {
                return interaction.editReply('現在、通常販売のギアはありません。');
            }

            const embed = new EmbedBuilder()
                .setTitle('ゲソタウン - 通常販売ギア')
                .setColor('#11edaa');

            const fields = items.map(item => {
                const gear = item.gear;
                return {
                    name: `${locale[gear.__splatoon3ink_id] || gear.name} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                    value:
                        `価格: ${item.price}\n` +
                        `販売終了: <t:${Math.floor(new Date(item.saleEndTime).getTime() / 1000)}:F>\n` +
                        `メインギアパワー: ${gear.primaryGearPower ? (locale[gear.primaryGearPower.__splatoon3ink_id] || gear.primaryGearPower.name) : 'なし'}\n` +
                        `ブランド: ${BRAND_MAP[gear.brand.name] || gear.brand.name}`
                };
            });

            embed.addFields(fields);
            embeds.push(embed);

        } else if (type === 'pickup') {
            const pickup = gearData.data.gesotown.pickupBrand;
            if (!pickup || !pickup.brandGears || pickup.brandGears.length === 0) {
                return interaction.editReply('現在、ピックアップ販売はありません。');
            }

            const embed = new EmbedBuilder()
                .setTitle(`ゲソタウン - ピックアップ: ${BRAND_MAP[pickup.brand.name] || pickup.brand.name}`)
                .setColor('#ed751f');

            const fields = pickup.brandGears.map(item => {
                const gear = item.gear;
                return {
                    name: `${locale[gear.__splatoon3ink_id] || gear.name} (${TYPE_MAP[gear.__typename] || gear.__typename})`,
                    value:
                        `価格: ${item.price}\n` +
                        `販売終了: <t:${Math.floor(new Date(item.saleEndTime).getTime() / 1000)}:F>\n` +
                        `メインギアパワー: ${gear.primaryGearPower ? (locale[gear.primaryGearPower.__splatoon3ink_id] || gear.primaryGearPower.name) : 'なし'}\n` +
                        `ブランド: ${BRAND_MAP[gear.brand.name] || gear.brand.name}`
                };
            });

            embed.addFields(fields);
            embeds.push(embed);
        }

        await interaction.editReply({ embeds });
    }
};
