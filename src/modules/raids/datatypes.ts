export class RaidsData {
    name = "Undefined"
    texts: Record<string, string> = {}
}

export enum ERaidsClasses {
    Warrior,
    Berserker,
    Assassin,
    Sorcerer,
    Archer,
    Cleric,
    Alchemist
}

export enum ERaidsCharacteristics {
    Universal,
    Strength,
    Agility,
    Intelligence,
    Luck,
    Perception
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
    // Icon to represent the option
    emoji: string
}

export type RaidsUserData = {
    id: number
    user_id: string,
    team_id: number,
    raid_id: number,
    class: ERaidsClasses,
    team: number,
    isHero: boolean,
    choices: Array<// Encounter Index
        Array<{ // Round Index
            choiceIndex: number,
            roll: number,
            success: boolean
        }>
    >
}

export type RaidsOverlayData = {
    bossBar: {
        mode: "None" | "HP" | "Puzzle"
        percentages: Record<string, number>
    },
    messages: {
        announcement?: string,
        title?: string,
        subtitle?: string,
    }
    timer: {
        mode: "None" | "Encounter" | "Paused"
        start?: number,
        end?: number
    }
}
