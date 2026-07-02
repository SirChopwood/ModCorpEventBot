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
        icon: ""
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
        icon: ""
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
        icon: ""
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
        icon: ""
    }
}