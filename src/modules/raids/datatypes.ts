export class RaidsData {
    name = "Undefined"
    texts: Record<string, string> = {}
}

export enum ERaidsClasses {
    Warrior,
    //Berserker,
    //Assassin,
    //Sorcerer
}

export enum ERaidsCharacteristics {
    Universal,
    Strength,
    Agility,
    Intelligence
}

export enum ERaidsRoundOptionType {
    // Roll a Characteristic + Modifiers
    SkillCheck,
    // Instantly pass if selected.
    AutoPass,
    // Instantly fail if selected.
    AutoFail
}

export type RaidsClass = {
    name: string,
    description: string,
    modifiers: Record<ERaidsCharacteristics, number>,
    colour: string,
    icon: string,
}

export type RaidsRound = {
    name: string
    texts: {
        opening: string,
        preResult: string,
        postResult: string,
    }
    options: Array<RaidsRoundOption>
}

export type RaidsRoundOption = {
    texts: {
        selection: string,
        pass: string,
        fail: string,
    },
    type: ERaidsRoundOptionType,
    // Which skill to apply modifiers for
    characteristic: ERaidsCharacteristics
    // Value (roll + modifier) has to beat
    difficulty: number
}

