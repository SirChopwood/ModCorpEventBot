import {ERaidsCharacteristics, RaidsClass, ERaidsClasses} from "../datatypes";

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
    }
}