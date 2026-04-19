import {RaidsCampaign, RaidsEncounter} from "../raids.js";
import {ERaidsCharacteristics, ERaidsRoundOptionType} from "../datatypes.js";
import RaidsModule from "../module.js";


export class TestCampaign extends RaidsCampaign {
    name = "Test Raid"

    constructor(module: RaidsModule) {
        super(module)
        this.encounters.push(new TestEncounter1(this))
        this.encounters.push(new TestEncounter2(this))
    }
}

export class TestEncounter1 extends RaidsEncounter {
    name = "This is the test encounter"
    texts = {
        title: "SOME BIG COOL ENCOUNTER NAME",
        introduction: "Something happens and you stumble upon this encounter. The party prepares themselves for what is to come."
    }
    rounds = [
        {
            name: "Test Round 1",
            texts: {
                opening: "A group of enemies approach, weapons in hand and ready for a fight!",
                preResult: "The party move in for the battle.",
                postResult: "After defeating what you can, the party moves on from the damaged group."
            },
            options: [
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Strength,
                    texts: {
                        selection: "Attack it head on.",
                        pass: "You slash at the creatures, dealing solid damage.",
                        fail: "You miss, taking damage from their counterattacks."
                    },
                    difficulty: 10
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Agility,
                    texts: {
                        selection: "Stand your ground, dodging their attacks.",
                        pass: "Through careful sidestepping, you avoid taking any damage, watching as the enemies trip over eachother.",
                        fail: "Despite attempts to be careful, you take a few stray hits and are forced to backstep from the fight."
                    },
                    difficulty: 10
                }
            ]
        },
        {
            name: "ROUND 2",
            texts: {
                opening: "The door leading further into the dungeon begins to close, your only chance to continue fading away.",
                preResult: "Despite the raging battle going on.",
                postResult: "Those who remain behind getting pummelled by the creatures continuing to enter the room."
            },
            options: [
                {
                    type: ERaidsRoundOptionType.AutoPass,
                    characteristic: ERaidsCharacteristics.Universal,
                    texts: {
                        selection: "Make a run for the door.",
                        pass: "You manage to escape and move on to the next chamber.",
                        fail: "You manage to escape and move on to the next chamber."
                    },
                    difficulty: 0
                },
                {
                    type: ERaidsRoundOptionType.AutoFail,
                    characteristic: ERaidsCharacteristics.Universal,
                    texts: {
                        selection: "Stay behind to continue the fight.",
                        pass: "You end up trapped in the room, left to fight away the horde as the party continues.",
                        fail: "You end up trapped in the room, left to fight away the horde as the party continues."
                    },
                    difficulty: 0
                }
            ]
        }
    ]
}

export class TestEncounter2 extends RaidsEncounter {
    name = "This is the second test"
    texts = {
        title: "SOME BIG COOL ENCOUNTER NAME ONCE AGAIN",
        introduction: "Something happens and you stumble upon this encounter. The party prepares themselves for what is to come."
    }
    rounds = [
        {
            name: "2 Test Round 1",
            texts: {
                opening: "A group of enemies approach, weapons in hand and ready for a fight!",
                preResult: "The party move in for the battle.",
                postResult: "After defeating what you can, the party moves on from the damaged group."
            },
            options: [
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Strength,
                    texts: {
                        selection: "Attack it head on.",
                        pass: "You slash at the creatures, dealing solid damage.",
                        fail: "You miss, taking damage from their counterattacks."
                    },
                    difficulty: 10
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Agility,
                    texts: {
                        selection: "Stand your ground, dodging their attacks.",
                        pass: "Through careful sidestepping, you avoid taking any damage, watching as the enemies trip over eachother.",
                        fail: "Despite attempts to be careful, you take a few stray hits and are forced to backstep from the fight."
                    },
                    difficulty: 10
                }
            ]
        },
        {
            name: "2 ROUND 2",
            texts: {
                opening: "The door leading further into the dungeon begins to close, your only chance to continue fading away.",
                preResult: "Despite the raging battle going on.",
                postResult: "Those who remain behind getting pummelled by the creatures continuing to enter the room."
            },
            options: [
                {
                    type: ERaidsRoundOptionType.AutoPass,
                    characteristic: ERaidsCharacteristics.Universal,
                    texts: {
                        selection: "Make a run for the door.",
                        pass: "You manage to escape and move on to the next chamber.",
                        fail: "You manage to escape and move on to the next chamber."
                    },
                    difficulty: 0
                },
                {
                    type: ERaidsRoundOptionType.AutoFail,
                    characteristic: ERaidsCharacteristics.Universal,
                    texts: {
                        selection: "Stay behind to continue the fight.",
                        pass: "You end up trapped in the room, left to fight away the horde as the party continues.",
                        fail: "You end up trapped in the room, left to fight away the horde as the party continues."
                    },
                    difficulty: 0
                }
            ]
        }
    ]
}