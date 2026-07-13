import {ERaidsCharacteristics, RaidsClass, ERaidsClasses} from "../datatypes.js";

export const RaidsClassData: Record<ERaidsClasses, RaidsClass> = {
    [ERaidsClasses.Warrior]: {
        name: "Warrior",
        description: "A disciplined frontline fighter with balanced combat skills.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 2,
            [ERaidsCharacteristics.Strength]: 3,
            [ERaidsCharacteristics.Agility]: 1,
            [ERaidsCharacteristics.Intelligence]: -2,
            [ERaidsCharacteristics.Luck]: -1,
            [ERaidsCharacteristics.Perception]: 1
        },
        colour: "#12a0e3",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelWarrior.png"
    },
    [ERaidsClasses.Berserker]: {
        name: "Berserker",
        description: "An unstoppable force driven by fury, sacrificing finesse for raw power.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 1,
            [ERaidsCharacteristics.Strength]: 3,
            [ERaidsCharacteristics.Agility]: 1,
            [ERaidsCharacteristics.Intelligence]: -3,
            [ERaidsCharacteristics.Luck]: -1,
            [ERaidsCharacteristics.Perception]: 2
        },
        colour: "#cd0e0e",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelBerserker.png"
    },
    [ERaidsClasses.Assassin]: {
        name: "Assassin",
        description: "A silent killer who strikes from the shadows with deadly precision.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 1,
            [ERaidsCharacteristics.Strength]: -1,
            [ERaidsCharacteristics.Agility]: 3,
            [ERaidsCharacteristics.Intelligence]: 1,
            [ERaidsCharacteristics.Luck]: 2,
            [ERaidsCharacteristics.Perception]: -3
        },
        colour: "#b0f510",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelAssassin.png"
    },
    [ERaidsClasses.Sorcerer]: {
        name: "Sorcerer",
        description: "A master of arcane power whose magical prowess comes at a physical cost.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 2,
            [ERaidsCharacteristics.Strength]: -2,
            [ERaidsCharacteristics.Agility]: -2,
            [ERaidsCharacteristics.Intelligence]: 4,
            [ERaidsCharacteristics.Luck]: 1,
            [ERaidsCharacteristics.Perception]: -1
        },
        colour: "#9b12d2",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelSorcerer.png"
    },
    [ERaidsClasses.Archer]: {
        name: "Archer",
        description: "An expert marksman with keen aim and swift reflexes.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 1,
            [ERaidsCharacteristics.Strength]: -1,
            [ERaidsCharacteristics.Agility]: 4,
            [ERaidsCharacteristics.Intelligence]: 0,
            [ERaidsCharacteristics.Luck]: -1,
            [ERaidsCharacteristics.Perception]: 2
        },
        colour: "#00702f",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelArcher.png"
    },
    [ERaidsClasses.Cleric]: {
        name: "Cleric",
        description: "A devoted healer whose faith grants resilience and wisdom.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 3,
            [ERaidsCharacteristics.Strength]: -1,
            [ERaidsCharacteristics.Agility]: -2,
            [ERaidsCharacteristics.Intelligence]: 1,
            [ERaidsCharacteristics.Luck]: 2,
            [ERaidsCharacteristics.Perception]: -2
        },
        colour: "#F1C40F",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelCleric.png"
    },
    [ERaidsClasses.Alchemist]: {
        name: "Alchemist",
        description: "A brilliant inventor who relies on preparation, knowledge, and experimentation.",
        modifiers: {
            [ERaidsCharacteristics.Universal]: 1,
            [ERaidsCharacteristics.Strength]: -2,
            [ERaidsCharacteristics.Agility]: 0,
            [ERaidsCharacteristics.Intelligence]: 4,
            [ERaidsCharacteristics.Luck]: -1,
            [ERaidsCharacteristics.Perception]: 2
        },
        colour: "#db720e",
        icon: "https://louismayes.xyz/images/modcorp/raids/PixelAlchemist.png"
    }
}