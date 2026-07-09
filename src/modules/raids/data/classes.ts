import {ERaidsCharacteristics, RaidsClass, ERaidsClasses} from "../datatypes.js";

export const RaidsClassData: Record<ERaidsClasses, RaidsClass> = {
    [ERaidsClasses.Warrior]: {
        name: "Warrior",
        description: "The jack of all trades, master of none.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 1,
            [ERaidsCharacteristics.Strength]: 0,
            [ERaidsCharacteristics.Agility]: 0,
            [ERaidsCharacteristics.Intelligence]: 0,
        },
        colour: "#ffbb00",
        icon: "https://media.discordapp.net/attachments/1495902018970062920/1523877483051745381/PixelModcorp.png?ex=6a4faf40&is=6a4e5dc0&hm=f92ca645c8dda017663a5a9209f57f01e4c041ec3ab533fc92539677f0a2981d&=&format=webp&quality=lossless"
    },
    [ERaidsClasses.Berserker]: {
        name: "Berserker",
        description: "Unmatched raw strength, capable of tackling any problem head first... literally.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 0,
            [ERaidsCharacteristics.Strength]: 2,
            [ERaidsCharacteristics.Agility]: 0,
            [ERaidsCharacteristics.Intelligence]: -1,
        },
        colour: "#ff0000",
        icon: "https://media.discordapp.net/attachments/1495902018970062920/1523877483051745381/PixelModcorp.png?ex=6a4faf40&is=6a4e5dc0&hm=f92ca645c8dda017663a5a9209f57f01e4c041ec3ab533fc92539677f0a2981d&=&format=webp&quality=lossless"
    },
    [ERaidsClasses.Assassin]: {
        name: "Assassin",
        description: "The sneaky rogue, masked by shadows and striking when you least expect it.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 0,
            [ERaidsCharacteristics.Strength]: -1,
            [ERaidsCharacteristics.Agility]: 3,
            [ERaidsCharacteristics.Intelligence]: -1,
        },
        colour: "#1b4e77",
        icon: "https://media.discordapp.net/attachments/1495902018970062920/1523877483051745381/PixelModcorp.png?ex=6a4faf40&is=6a4e5dc0&hm=f92ca645c8dda017663a5a9209f57f01e4c041ec3ab533fc92539677f0a2981d&=&format=webp&quality=lossless"
    },
    [ERaidsClasses.Sorcerer]: {
        name: "Sorcerer",
        description: "Arcane Adept, wielding their knowledge as their weapon and words as their tools.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 0,
            [ERaidsCharacteristics.Strength]: -2,
            [ERaidsCharacteristics.Agility]: 1,
            [ERaidsCharacteristics.Intelligence]: 2,
        },
        colour: "#44bb29",
        icon: "https://media.discordapp.net/attachments/1495902018970062920/1523877483051745381/PixelModcorp.png?ex=6a4faf40&is=6a4e5dc0&hm=f92ca645c8dda017663a5a9209f57f01e4c041ec3ab533fc92539677f0a2981d&=&format=webp&quality=lossless"
    }
}