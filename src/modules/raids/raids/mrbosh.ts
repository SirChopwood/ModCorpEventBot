import {RaidsRaid, RaidsEncounter} from "../raids.js";
import {ERaidsCharacteristics, ERaidsRoundOptionType} from "../datatypes.js";
import RaidsModule from "../module.js";


export default class MrBoshRaid extends RaidsRaid {
    name = "The Rise and Fall of Mr Bosh"

    constructor(module: RaidsModule, id: number) {
        super(module, id)
        this.encounters.push(new MrBoshChallenge(this))
        this.encounters.push(new EscapingMrBosh(this))
    }
}

export class MrBoshChallenge extends RaidsEncounter {
    name = "THE MR. BOSH CHALLENGE"
    texts = {
        title: "THE MR. BOSH CHALLENGE",
        introduction: "You wake up to blinding lights piercing your eyelids, your body feels heavy, it's a struggle just to open your eyes. You hear a loud booming voice ring through your head “I trapped teams of people inside this grocery store, and all they have to do is survive for 24 hours to win 5 million.” After recovering your vision from the lights you see around you are your camp neko teammates “If they want to leave all they have to do it walk out in the next 60 seconds.” Even if you wanted to leave you could not get your body to move.",
        ending: "You manage to survive the night, for better or for worse."
    }
    rounds = [
    {
        name: "Defending Supplies",
        texts: {
            opening: "After gathering together with your team a man in a suit approaches your team. “By staying here you agree to participate in this Mr.Bosh Inc competition and Mr.Bosh Inc will not be responsible for any damage or injuries sustained for the duration of the challenge. Good luck and good hunting.” With that the man disappears. Camera drones buzz around your head as they begin to record you and your teammates. Before you can even take stock of what you have two other teams appear on either side of the aisle “Hey soup aisle team you can leave this aisle to us now” One team holds various toiletry supplies while the other holds Lego sets and TCG packs",
            preResult: "Prepare to defend your supplies.",
            postResult: "After gathering what supplies you have left after the fight, You move on to the next problem, your own supplies."
        },
        options: [
            {
                type: ERaidsRoundOptionType.SkillCheck,
                characteristic: ERaidsCharacteristics.Strength,
                texts: {
                    selection: "You charge in with a soup can in each hand to batter anything that stands in your way",
                    pass: "You overwhelm all enemies in your path, Unaffected by their attempts to cover you in toilet paper.",
                    fail: "OUCH, you step on a lego trap, soup cans slip from your hands and break on the ground causing you to slip onto your back."
                },
                difficulty: 10,
                emoji: "⚔"
            },
            {
                type: ERaidsRoundOptionType.SkillCheck,
                characteristic: ERaidsCharacteristics.Agility,
                texts: {
                    selection: "you prepare to throw soup cans at anyone that approaches.",
                    pass: "Your aim is true, nobody dares to come with your range, you save your ammo and your supplies.",
                    fail: "Before you can even throw your first cans you are brought to the ground by thousands of TCG cards being thrown at you, the weight begins to crush y-OH SHIT IS THAT AN S.I.R GENGAR?. Your vision goes blank."
                },
                difficulty: 12,
                emoji: "🛡"
            },
            {
                type: ERaidsRoundOptionType.SkillCheck,
                characteristic: ERaidsCharacteristics.Luck,
                texts: {
                    selection: "Maybe, just maybe I can make them all slip on soup.",
                    pass: "You throw the soup forward, the angle is perfect as it avoids your team and rolls right under the other team, the all start to slip and fall, you are a genius .",
                    fail: "You throw the soup directly at your team's feet, a soup can roll beneath your and you flip ass over head onto the ground, you really wish you had toilet roll right now."
                },
                difficulty: 6,
                emoji: "🎲"
            },
            {
                type: ERaidsRoundOptionType.AutoPass,
                characteristic: ERaidsCharacteristics.Universal,
                texts: {
                    selection: "you run away to hide and see what happens to your outnumbered team.",
                    pass: "You manage to hide and regroup with your team later.",
                    fail: "You manage to hide and regroup with your team later."
                },
                difficulty: 0,
                emoji: "👟"
            }
        ]
    },
    {
        name: "Gathering supplies",
        texts: {
            opening: "You need some supplies of your own, soup alone might not cut it for the night, some need medical supplies, some need to clean themselves up and some just want a drink, what do you do?",
            preResult: "Go forth and gather what you need",
            postResult: "After gathering what supplies you can, the Team Attempts to survive the night."
        },
        options: [
            {
                type: ERaidsRoundOptionType.SkillCheck,
                characteristic: ERaidsCharacteristics.Strength,
                texts: {
                    selection: "That fight was not enough for you, you want more, might as well gather supplies as an excuse to brawl some more.",
                    pass: "The entire store learns to fear your power, some give you supplies before you even get a chance to fight them, what's even the point.",
                    fail: "You might have bitten off more than you can chew, you return to your team broken and battered, with no supplies but at least you had a good brawl to pass the time."
                },
                difficulty: 13,
                emoji: "⚔"
            },
            {
                type: ERaidsRoundOptionType.SkillCheck,
                characteristic: ERaidsCharacteristics.Agility,
                texts: {
                    selection: "Avoiding fighting might be the best option here, nothing wrong with a bit of thievery in a challenge right?, I've got quick hands after all",
                    pass: "Nobody even hears you move through the aisle it's like you are playing assassins creed on easy mode, you blend in amongst the other teams, taking whatever you want.",
                    fail: "As soon as you leave your aisle you attempt to blend into another team, too bad you are wearing a shirt that clearly shows you are from another group, you get no supplies and a beating for your trouble.."
                },
                difficulty: 14,
                emoji: "🏹 "
            },
            {
                type: ERaidsRoundOptionType.SkillCheck,
                characteristic: ERaidsCharacteristics.Intelligence,
                texts: {
                    selection: "what if I just trade with the other teams?, A trade up challenge might be fun.",
                    pass: "From the singular can of soup have you got more than enough supplies, turns out food is pretty valuable when you have to survive especially food that can also hydrate you.",
                    fail: "The first team you approach to trade with accept your trade, a can of soup so you don't get beaten to a pulp, you return to your team with no supplies ."
                },
                difficulty: 8,
                emoji: "🎲"
            },
            {
                type: ERaidsRoundOptionType.AutoPass,
                characteristic: ERaidsCharacteristics.Universal,
                texts: {
                    selection: "Yea…Gather supplies…sure, I think I saw some useful supplies over by the alcohol section.",
                    pass: "You blackout until morning, Its one way of passing the time I guess.",
                    fail: "You blackout until morning, Its one way of passing the time I guess."
                },
                difficulty: 0,
                emoji: "👟"
            }
        ]
    }
]}

export class EscapingMrBosh extends RaidsEncounter {
    name = "ESCAPING MR. BOSH"
    texts = {
        title: "ESCAPING MR. BOSH",
        introduction: "You wake up to blinding lights piercing your eyelids, your body feels worse for wear but you are still alive, not too long now and the challenge will be done, and you can leave this wretched place. As soon as you finish that thought you once again hear that voice that trapped you here in the first place ‘contestants you have almost survived the night but my producers have told me that this challenge is too boring, so let's up those ratings’.",
        ending: "It’s over, it's finally over, you have made it out, but outside is nothing, it's just a set. There is no prize, it was all just a game. In the distance you see a familiar site, its… Camp Neko? We were near to camp neko this whole time?? Well I guess we know how he got everyone for his content. At least now you can go back to your cabin and get some rest. After all nothing bad ever happens in camp neko right?"
    }
    rounds = [
        {
            name: "Survive the Fans",
            texts: {
                opening: "The doors of the store that were previously closed start to open some teams that are closer start to run before being crushed by hordes of people flowing in “I told my adoring fans that anything they can get their hands on is theirs BUT ADDITIONALLY if they manage to defeat any of you they get 100K so lets see what you can all do.” you see teams fall one after another before the fans with strange glowing blue eyes turn towards you. What do you do? ",
                preResult: "The fans start rushing you, do something quick!.",
                postResult: "Well that's the fans dealt with but how do you get out of here?."
            },
            options: [
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Agility,
                    texts: {
                        selection: "This horde needs to be stopped, I bet I can trip them while still avoiding them.",
                        pass: "You move through the lines of fans tripping only the best targets, one trip and 10 fans fall, the hordes momentum is greatly reduced.",
                        fail: "you move out and spot your target, the fat one at the front, easy to trip and will bring down plenty with him. you move in, lean down and put your leg out, why is the sky darkening?.. Oh no.."
                    },
                    difficulty: 14,
                    emoji: "⏩"
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Strength,
                    texts: {
                        selection: "I have to defend my team at all cost, even if I get hurt. I put myself between these freaks and my team.",
                        pass: "You endure the absolute onslaught of fans, the waves crash against you and whatever you have to shield yourself with, but most importantly your team is safe behind you.",
                        fail: "You hold for a moment but there are just too many of them, you fold beneath the pressure and can only hope the rest of your team have a plan."
                    },
                    difficulty: 10,
                    emoji: "🛡"
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Perception,
                    texts: {
                        selection: "Maybe we can use the aisle to our advantage and have some of the horde flow past us.",
                        pass: "You get your team to pull at the Aisle to narrow the entrance, the most of the horde flow past you.",
                        fail: "You tell some teammates to move the aisle but as soon as they move into the open to do so they are run over by the horde, you notice too late that you entire team is now exposed to the fans."
                    },
                    difficulty: 10,
                    emoji: "🎲"
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Luck,
                    texts: {
                        selection: "Screw the team I need to survive this madness.",
                        pass: "You run for the door to escape.",
                        fail: "you attempt to run for the door and escape but trip on your own feet."
                    },
                    difficulty: 15,
                    emoji: "👟"
                }
            ]
        },
        {
            name: "Escape",
            texts: {
                opening: "You have dealt with the initial onslaught, but there are still so many of these crazy fans around. A large screen descends with Mr. Bosh on it, “Well what are you waiting for, it's your chance to get that prize money, you just have to leave, what amazing conten- I mean contestants you have all been.” ",
                preResult: "Well, it's your only way out, what do you do?",
                postResult: "YOU’VE DONE IT YOU ARE OUT. FREEDOMMMMMM!."
            },
            options: [
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Strength,
                    texts: {
                        selection: "I just have to push forward, just keep going, I trust in my endurance.",
                        pass: "You just close your eyes and push onward, step by step, breath by breath, and when you open your eyes you are out. You did it.",
                        fail: "You try to move but your body just won't go, ‘MOVE DAMMIT, MOVE’. Nothing. You feel yourself being pushed from behind, it's your team, maybe you can just make it out.."
                    },
                    difficulty: 5,
                    emoji: "🛡"
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Agility,
                    texts: {
                        selection: "Ok, it's not too far now, Im fast and agile I can lead my team out",
                        pass: "You lead your team on the best route out, slowly getting closer to the exit until you have finally done it, IT'S OVER!.",
                        fail: "You try to lead your team out but there are just too many obstacles in the way, all you can do is hope your team can make it out.  ."
                    },
                    difficulty: 5,
                    emoji: "⏩"
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Universal,
                    texts: {
                        selection: "I Just need to push everyone from behind and make sure we all get out, even if i get left behind.",
                        pass: "You keep the team moving and make sure no one gets left behind and slowly but surely, you all make it out.",
                        fail: "You keep the team moving and make sure no one gets left behind and slowly but surely, you all make it out."
                    },
                    difficulty: 0,
                    emoji: "🎲"
                },
                {
                    type: ERaidsRoundOptionType.SkillCheck,
                    characteristic: ERaidsCharacteristics.Intelligence,
                    texts: {
                        selection: "I don't believe his lies, I'm staying here.",
                        pass: "You get dragged outside by your team, that's one way to get out.",
                        fail: "You get left behind inside with only the fans, they all turn towards you, eyes glowing."
                    },
                    difficulty: 2,
                    emoji: "👟"
                }
            ]
        }
]}

