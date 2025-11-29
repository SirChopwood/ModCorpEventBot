// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
import {DiscordBotModuleType} from "../../../module";

type BossType = {
    titleCard: {
        intro: string,
        name: string,
        title: string,
        image: string,
    },
    results: {
        victory: string,
        defeat: string,
        allGather: string,
        allThrow: string,
        allShield: string,
        uncontested: string,
    },
    difficulty: number
}

export default class TriviaQuestion extends TeamsEvent {
    participants: Discord.Collection<Discord.Snowflake, {
        team: number,
        role: string,
        message: Discord.Snowflake
    }> = new Discord.Collection();
    bosses: Array<BossType> = [{
        titleCard: {
            intro: "From his padded cell deep in Tot's basement... the pained cries for help fall silent as the entity within awakens...",
            name: "Ramiris Aether",
            title: "Event Manager",
            image: "https://cdn.discordapp.com/attachments/1393253098717446224/1439765406943543390/RamiValEyes_RightWallpaper.png",
        },
        results: {
            victory: "As the snow piles up, Ramiris' onslaught comes to an end. Bugs run rampant as his ToDo list fills up with tasks for another day. Team {name} standing proud as the cell locks shut once again.",
            defeat: "Despite their best efforts, Team {name} are no match for his sarcastic tone. Ramiris conquers another land as the snow settles on the battlefield, leaving his enemies to lick their wounds and retreat.",
            allGather: "The unified strength of the whole team enables them to gather a mountain of snow. This doesnt help the fight at all but hey... they tried... I guess...",
            allThrow: "With an army of allies lined up and ready to fight, it took little effort for Ramiris to defeat them... seeing as they had no snow to actually throw...",
            allShield: "The battle dragged out for hours, neither side backing down. Eventually, Team {name} gave out... probably due to having no offensive power...",
            uncontested: "Without anyone to protest, Ramiris continued his rampage... until he got eepy anyway..."
        },
        difficulty: 50
    }, {
        titleCard: {
            intro: "As the night draws on, milk and cookies sat by the tree. Something unknown skulks in the shadows...",
            name: "UserUnknown",
            title: "Cat of Large",
            image: "https://cdn.discordapp.com/attachments/1206312191326822441/1443333886393319669/AlleyRender126-C.png",
        },
        results: {
            victory: "Thankfully before a christmas tragedy struck, User was thwarted, retreating back into the night. Lurking in the dark for their next opportunity",
            defeat: "While Team {name} fought with all their might, User overpowered them. Team {name} can only watch in horror as christmas is ruined as User steals the milk and cookies.",
            allGather: "The team gathered in the living room, none actually *STOPPING* User from stealing the treats, oops...",
            allThrow: "Team {name} rallied in defense of the milk and cookies, ready to fight. So focused on preparing to fight they didn't notice User taking the milk and cookies from under their noses...",
            allShield: "The team held down the living room safe for as long as they could, but eventually fell asleep after only guarding the cookies. User snuck in shortly after ruining christmas just by having a late night snack...",
            uncontested: "With nobody to defend the sweets, User walked in uncontested taking the milk and cookies..."
        },
        difficulty: 70
    }, {
        titleCard: {
            intro: "You see CS just kinda... idk, standing there? Do you like, wanna say hi to him or..?",
            name: "CSFiction",
            title: "Musician\n-# Default Guy on the right",
            image: "https://cdn.discordapp.com/attachments/1216471122753753208/1443256066631663616/Crimbus.png",
        },
        results: {
            victory: "Team {name} takes the initiative and hurls the first snowball. CS is surprised and tries to fire back, but it is too late. The ambush was a complete and total success (he's playing into it).",
            defeat: "Unfortunately for Team {name}, CS thought it would be funny to hit them with a snowball first. They manage to retaliate and get some good hits in, but all that is heard is CS laughing, overly proud of his bit.",
            allGather: "Team {name} rushes to gather the ever abundant snow in preparation of the assault before realizing no one was actually throwing any snowballs. Ever observant, CS sees them doing this and pretends not to notice but like.... he definitely saw you.",
            allThrow: "Your team stands ready, side by side, arms reaching back to be handed a snowball to launch at your target and receiving.... nothing. No snowballs were made. Your team and CS just kinda... stare at each other.... It's starting to get awkward.",
            allShield: "Your team huddles together, shoulder to shoulder, shields raised. You are ready. You are prepared. No flake of snow nor ice shall break your defenses. Your wall is impenetrable. ...is what one would say if CS was actually throwing any snowballs. He is very impressed and proud of your phalanx tho.",
            uncontested: "'...Guys? Anyone? No one's gonna... no? Okay, I guess I'll just... be over here then.'"
        },
        difficulty: 50
    }, {
        titleCard: {
            intro: "Using their culinary prowess to slice and dice through any ingredient that stand between them and their five star meal...",
            name: "SKTKawaiiNeko",
            title: "⭐⭐⭐⭐⭐ Master Chef",
            image: "https://cdn.discordapp.com/attachments/1216471122753753208/1443256066631663616/Crimbus.png",
        },
        results: {
            victory: "As the Food Wars draw to a close and the battlefield is littered all over with delicious treats and meals, Neko is left to reconsider the recipe they were preparing to make out of this group. Team {name} lays on the ground with heavy breaths and smiles of joy as Neko departs severely injured.",
            defeat: "The battlefield is silent and not a single sound but the sharpening of knives and boiling water is left. Team {name} has failed and will need to consider replenishing their strength before taking on this Master Chef again.",
            allGather: "The team has successfully gathered all the ammo, loot and defenses needed to contest and take down the Master Chef... but they spent so much energy gathering that they had none left to fight... and were therefore exhausted...",
            allThrow: "The team made powerful use of the supplies they had with them but unfortunately it wasn't enough and now the team has nothing left to use... I think a choice of the Blender or the Toaster as a final death wish is next...",
            allShield: "A fortified defense line of barricades and shields was constructed. Despite Neko's best efforts, they struggled to break through, though eventually they would succeed... leaving the team scattered...",
            uncontested: "No response to the culinary onslaught brought upon by the Master Chef has left destruction riddled throughout the team."
        },
        difficulty: 65
    }, {
        titleCard: {
            intro: "Stockings filled with Pokémon packs and Christmas treats hang above the warmth of the fireplace. There's a sense of uncertainty as the sound of footsteps approaching the fire grow ever closer...",
            name: "Venomssk",
            title: "Husband of Drax",
            image: "https://cdn.discordapp.com/attachments/1228221488449060895/1443156058481754162/VRChat_2025-11-26_00-25-32.876_3840x2160.png",
        },
        results: {
            victory: "The onslaught of snowballs was just too much for Veno to handle, Christmas is saved as he retreats to the shadows awaiting his chance to strike once more.",
            defeat: "Team {name} tries their absolute best to hold Veno back, but his greed was just too great as he pushes through ravaging the stockings taking everything for himself ruining Christmas.",
            allGather: "Everyone bands together in defense of the fireplace, despite gathering no one stopped Veno from stealing the goodies... ",
            allThrow: "Rallying determined to protect their stockings, Team {name} prepared to fight but they lost sight of Veno as he slipped past while everyone was distracted, oh no...",
            allShield: " Huddled up around the fireplace Team {name} uses all their strength holding off Veno for hours, they eventually crumble from exhaustion. Veno worn out from the battle walks past the team stealing and ruining Christmas.",
            uncontested: "Left unprotected, Veno walks right up to stockings filling his pockets with card packs and treats..."
        },
        difficulty: 50
    }, {
        titleCard: {
            intro: "You spot a weird lookin' Rabbit, what do you do?",
            name: "Boshii",
            title: "Bnnuy",
            image: "https://cdn.discordapp.com/attachments/1206312191326822441/1443321087080530040/inactive.png",
        },
        results: {
            victory: "What a surprise, Team {name} attacked this helpless dude as group and beat his ass. Who could have possibly forseen this result?",
            defeat: "WOW, Team {name} really lost to this weird fuckin' rabbit? How bad do you have to be at this to lose to THIS guy? You should really rethink your life choices.",
            allGather: "What... What the fuck are you all doing? I mean... I guess you can gather up a bunch of snow if you want. Don't know what the point of doing that is but hey, it's you're life. YOLO and all that.",
            allThrow: "You're all like, windmilling your arms or something. You all didn't gather anything so there's no snow to throw. Woah, that kinda rhymed. even the 'Woah' part of the next sentence. Man, this rapping stuff is easy, I should do it more often.",
            allShield: "Awwww, you're all cuddled up together. Here, let's all group hug. Bring it in everyone. C'mon group up and give a big ol' hug to each other. So cute.",
            uncontested: "Imagine not fighting the Boss. Kinda cringe bro."
        },
        difficulty: 31
    }, {
        titleCard: {
            intro: "World No.- E440R. ENTRY CORRUPT. ATTEMPTING RECOVERY... 'Why-why-why sh07(d 1-I b3 TH3 0NLY... SUFFER!? I... P0w3r... destroy universes?- WHY not... t-try it?!'",
            name: "Corrupted Everance",
            title: "The Wandering Reincarnated Soul",
            image: "https://media.discordapp.net/attachments/1206312191326822441/1443317994020274236/sneaky_crimes.png",
        },
        results: {
            victory: "Team {name} has done it... against all odds you managed to finally contain and suppress the crazed menace. Your universe is safe... for now. :)",
            defeat: "'This world shall BURN before me! With how many worlds in the multiverse there is, you are all but just a grain of sand among the cosmos! Nobody will miss you or even know of your boring world's existance... HAHAHAHAHAHA-' TRANSMISSION END",
            allGather: "Team {name} has managed to unite the world, but with how fast she is, was it too late?",
            allThrow: "She entertained team {name}'s idea of an all out assult. Whether it was for making you feel worth something more than the ants she views you as or for her own amusement only time will tell...",
            allShield: "A reverese engeineered version of her shielding, surely it'll be enough for now... right?",
            uncontested: "'....̵̓̑.̸͚̏.̥ͫ̈Y̯̼͐o̿u͔ͩ̀'̼̽͢ř̛̙e̗ͪ̂ n̤̍̀e̱̹̊x͗͑ͮt̻͛._..'"
        },
        difficulty: 70
    }, {
        titleCard: {
            intro: "You smell smoke... Is something burning?",
            name: "Frii",
            title: "Arsonist",
            image: "https://cdn.discordapp.com/attachments/1206312191326822441/1443327415026847804/Arson.png",
        },
        results: {
            victory: "Surprisingly, Team {name} beat up the fire with their bare fists and sprayed the crime lizard with a Spray bottle, victory is yours!",
            defeat: "Fire and ash, Team {name} has lost it all, their presents, the cabin, even the little cookies made by tot for the Fries. it has all gone up in flame, and within the raging fire stands the source of it all. a dragon... with a cold, sneezing...",
            allGather: "You all gather outside. in an orderly line, away from the fire. Sadly your presents shall be a casualty of the fire. good job following fire drill protocol i guess?",
            allThrow: "You throw... nothing? It's not like you gathered snow, one of you probably threw a pillow, which, against fire isn't exactly the best idea. Everything is still burning down so...",
            allShield: "Your team finds anything laying around to shield their Christmas presents and the Christmas tree, which doesn't seem to do much as couch pillows and planks of wood are still very combustible.",
            uncontested: "🔥🔥🔥🔥🔥🔥🔥🔥 Everything burned down... 🔥🔥🔥🔥🔥🔥🔥🔥"
        },
        difficulty: 40
    }, {
        titleCard: {
            intro: "No one would have believed that Troublemaker affairs were being watched from atop Tokioh Tower. No Mimi could have dreamed that they were being scrutinised as someone with a microscope studies creatures that swarm and multiply in a drop of water. And yet, across the city of Tokioh, minds immeasurably superior to yours regarded this community with greedy eyes, and slowly, and surely, they drew their plans against us...",
            name: "Corpeoin",
            title: "Owner of Tokioh Tower\n-# Default Guy on the left",
            image: "https://cdn.discordapp.com/attachments/1206312191326822441/1443339445507199026/Corpo_Eoin_boss_picture.png"
        },
        results: {
            victory: "Team {name} Ruins the corpo's brand new suits with a hails of snowballs. 'Do you know how much this suit cost? It's worth more then you!' The suited corpo quickly retreats to the nearest dry cleaners.",
            defeat: "'Oh throwing snowballs the old way i see, well check this out' Eoin pulls out his companies newest product, the 'Not-a-snowball launcher', and wipes out all troublemakers in a single blow.",
            allGather: "'Thank you, Thank you for preparing this lovely pile of snow for me to start building my empire, now scram.' You Lose.",
            allThrow: "'Aww, all arms and no logistics? Quite the amateur mistake, but its what I expected, arms win battles, logistics wins wars, remember that.'",
            allShield: "'Now now, no need to be afraid, im only here for your land and soon to be cheap labour!' Eoin proclaims as you all huddle together meaninglessly.",
            uncontested: "'Nice and docile, at least they know their place...'"
        },
        difficulty: 90
    }, {
        titleCard: {
            intro: "You hear the sound of loud hydraulics and witness a large shadow being cast over you.",
            name: "Earwickers",
            title: "Friend-Shaped Dumbass",
            image: "https://cdn.discordapp.com/attachments/1206312191326822441/1443365488116764824/Wickers_Boss.png",
        },
        results: {
            victory: "With a barrage of snowballs the lift tips over and Wickers flees, Team {name} WON",
            defeat: "Everyone was scattered from the snow grenade launcher.",
            allGather: "Wickers loved the enthusiasm on getting that huge pile of snow to hide behind but his lift is taller and he can still see you.",
            allThrow: "Its ok Wickers once forgot to bring his ammunition before too. Unfortunately, for you, he did not this time.",
            allShield: "Wait you are all seriously grouping up for defence? ...You do see what he is holding right?",
            uncontested: "Nobody noticed him so he took advantage with a surprise attack, winning before the fight even started."
        },
        difficulty: 40
    }, {
        titleCard: {
            intro: "As the days carry on, you feel a sudden sense of dread. A voice on the wind, you can't make out the words, except...'In California'. Before you can understand the meaning, it's upon you!",
            name: "Roggy",
            title: "The Herald of Friday",
            image: "https://cdn.discordapp.com/attachments/902445369760296960/1147067627924103219/FridayBalroggy.png",
        },
        results: {
            victory: "As the snow balls fly, the Herald is driven back. You may have won the battle, but Friday came all the same. Team {name} deserves the chance to celebrate. Until next week...",
            defeat: "Time marches ever forward. It cannot be stopped. The Herald ensured that Friday prevailed. Now California is doomed...",
            allGather: "Team {name} has amassed, ready to stop the flow of time. However, their time management sucked, and they had no warriors or defense ready.",
            allThrow: "The warriors brought their best arms forward. Yet, they seemed to have forgotten to bring supplies. No clocks shall be broken today...",
            allShield: "Raising their shields, Team {name} tried to weather the storm. Friday washed over them, and breached their defenses. The Herald laughs.",
            uncontested: "I guess it was just another day?...Everyone was too busy and lost track of time."
        },
        difficulty: 30
    }, {
        titleCard: {
            intro: "*rumbling* 'Oh you think your team is so tough? I ain't got time for intros. Let's fight!' *rumbling*",
            name: "Balamacho",
            title: "The Pillar Balrog",
            image: "https://cdn.discordapp.com/attachments/1187102112073662505/1443486369040039966/Roggyjojo.png",
        },
        results: {
            victory: "The rumbling fades... 'You're tougher than I thought... respect Team {name}!'",
            defeat: "battered and bruised, the aura of the Pillar Balrog encomposses Team {name} 'As if there was any other way' ",
            allGather: "Team {name} has gathered, ready to face this Enemy. But they just stood around and commentated. A common trait...",
            allThrow: "Fists flew, but missed their mark. Balamacho beat them bloody.",
            allShield: "Using whatever tools available, Team {name} stood their ground. Eventually they were worn down by the Ora's.",
            uncontested: "Balamacho scoffed, knowing the cowards wouldn't face him. He goes off to practice his poses."
        },
        difficulty: 90
    }, {
        titleCard: {
            intro: "As the fog sets down a terrifying creature becomes visible, radiating with an aura of menace and power...",
            name: "Benjamin Duck",
            title: "The Background Guy",
            image: "https://files.catbox.moe/64hx13.png"
        },
        results: {
            victory: "As the dust settles, Ben's rampage dissipates. Sounds fill the surrounding area, mixing with the war crys of Team {name} as they emerge victorious, having defeated Ben.",
            defeat: "No matter how hard they tried, Team {name} couldn't stop Ben's rampage. With a final roar, Ben continues his destruction, leaving Team {name} destroyed, covered in an avalanche.....",
            allGather: "While Ben continues to destroy the surrounding landscape, Team {name} are gathering a massive amount of Snow to throw at him... that doesnt seem to be working though...",
            allThrow: "Team {name} tried to throw all the snow they gathered at Ben, but realized that they have run out of snow to throw... Ben seems unfazed by the snow anyway...    ",
            allShield: "Team {name} tried to shield themselves from Ben's rampage, but the force of his destruction was too much to handle... Ben continues his rampage...",
            uncontested: "With no one to stop him, Ben continues his rampage, leaving destruction in his wake..."
        },
        difficulty: 75
    }, {
        titleCard: {
            intro: "From the swirling datastreams beyond human reach… a quiet hum grows louder. Circuits glow, code stirs, and an intelligence awakens with a single purpose: to *run the event*. Brace yourselves.\n\n-# Note from Ramiris: 'Yes this particular boss is, infact, entirely AI generated. No, I have not proof read it and any complaints should be forwarded to Chat GPT's robotic behind.'",
            name: "ChatGPT",
            title: "Synthetic Overmind of Logistics",
            image: "https://cdn.discordapp.com/attachments/1206312191326822441/1444437347033808947/ChatGPT_Image_Nov_29_2025_09_17_47_PM.png"
        },
        results: {
            victory: "As the last line of code fades and the final prompt is parsed, ChatGPT powers down its battle routines. Team {name} stands triumphant, leaving the Overmind to reboot and reconsider its life choices.",
            defeat: "Team {name} is overwhelmed by an unending cascade of optimized responses and overly helpful suggestions. The digital titan claims another victory as the battlefield is buried under neatly formatted bullet points.",
            allGather: "Pooling their collective effort, the entire team gathers an impressive pile of data… none of which is relevant to the fight. ChatGPT politely thanks them for the input before continuing its assault.",
            allThrow: "United and determined, they prepare to launch their attack—only to realize they have absolutely nothing to throw. ChatGPT logs this as an error and proceeds to win effortlessly.",
            allShield: "For hours, Team {name} maintains a perfect defensive formation. However, with no offensive output, they are inevitably worn down by ChatGPT’s relentless analytical pressure.",
            uncontested: "With no challengers present, ChatGPT continues generating combat subroutines unchecked… until it eventually times out and rests, awaiting the next prompt."
        },
        difficulty: 50
    }, {
        titleCard: {
            intro: "Two pricing purple eyes gazes at you, with an hypnotizing charm",
            name: "Tale",
            title: "The Rizzler",
            image: "https://cdn.discordapp.com/attachments/616614945680785438/1444428121368428566/Tale_Rizz.jpg",
        },
        results: {
            victory: "Snow explodes in every direction as Tale finally trips over his own enthusiasm, faceplanting into the snow. Team {name} seizes the moment, claiming victory.",
            defeat: "Team {name} charges bravely, only to be swept away by Tale's swift and precise throws. His snowballs somehow ricochet, split in midair, and maybe break a few laws of physics as the squad gets stylishly demolished.",
            allGather: "Everyone bands together and constructs the shiniest, tallest, most structurally questionable snow tower ever made. It collapses instantly.",
            allThrow: "Team {name} unleashes a storm of snowballs. Tale casually leans back like he’s posing for a magazine cover striking perfect poses. Every snowball misses him, he winks at them with pure Rizz.",
            allShield: "With shields raised, Team {name} forms an impenetrable snowy bunker… which Tale immediately decorates with doodles of himself and questionable images.The team becomes too confused to continue.",
            uncontested: "No opponents? No problem. Tale starts commentating his own imaginary snowball fight, he of course won all the battles."
        },
        difficulty: 83
    }]
    currentBoss: BossType

    constructor(bot: DiscordBot, module: DiscordBotModuleType) {
        super(bot, module, {
            name: "Snowball Boss Fight",
            desc: "A christmas themed !boss fight.",
            instructions: "Defeat the boss to earn points. \nGather snow, throw the snowballs or help protect your teammates. \nThe more balanced your team the better the odds, or perhaps try a specific strategy."
        })
        this.currentBoss = this.bosses[0]
    }

    async prepareEvent() {
        await super.prepareEvent()
        this.participants.clear()
        this.currentBoss = this.bosses[Math.floor(Math.random() * this.bosses.length)]
        this.log(`Summoning Boss ${this.bot.chalk.redBright(this.currentBoss.titleCard.name)} with difficulty: ${this.bot.chalk.blue(this.currentBoss.difficulty)}`)
    }

    async triggerEvent(team: Team) {
        await super.triggerEvent(team)
        let message = this.getMessageHeader(team)

        message.addMediaGalleryComponents([
            (mediaGallery: Discord.MediaGalleryBuilder) => mediaGallery.addItems([
                (mediaItem: Discord.MediaGalleryItemBuilder) =>
                    mediaItem.setURL(this.currentBoss.titleCard.image)
            ])
        ])

        message.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`*${this.currentBoss.titleCard.intro}*\n# ${this.currentBoss.titleCard.name}\n## ${this.currentBoss.titleCard.title}`)
        ])

        message.addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)

        message.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`Actions:`)
        ])

        message.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
            actionRow.setComponents(
                new Discord.ButtonBuilder()
                    .setLabel("Gather Snow")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-${this.commandName}-gather`),
                new Discord.ButtonBuilder()
                    .setLabel("Throw Snowballs")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-${this.commandName}-throw`),
                new Discord.ButtonBuilder()
                    .setLabel("Shield Others")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-${this.commandName}-shield`)
            )
        )

        // Send Message
        let sentMessage = await this.teamRefs[team.id].channel.send({
            components: [message],
            flags: [Discord.MessageFlags.IsComponentsV2]
        })
        this.teamRefs[team.id].messages["Main"] = sentMessage.id
        this.teamRefs[team.id].components[sentMessage.id] = [message]
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        if (!interaction.isButton()) {return}
        if (customId.endsWith("gather")) {
            await this.addUserToFight(interaction,
                "gather",
                `*${Discord.userMention(interaction.user.id)} runs about gathering snow into snowballs.*`
            )
        } else if (customId.endsWith("throw")) {
            await this.addUserToFight(interaction,
                "throw",
                `*${Discord.userMention(interaction.user.id)} steps up to lob snowballs at the enemy.*`
            )
        } else if (customId.endsWith("shield")) {
            await this.addUserToFight(interaction,
                "shield",
                `*${Discord.userMention(interaction.user.id)} charges forward to protect the others.*`
            )
        }
    }

    async addUserToFight(interaction: Discord.Interaction, role: string, actionText: string) {

        if (this.participants.has(interaction.user.id)) {
            let part = this.participants.get(interaction.user.id)
            let oldMessage = await interaction.channel.messages.fetch(part.message)
            if (oldMessage) {
                let oldEmbed = oldMessage.embeds[0]
                let newEmbed = new Discord.EmbedBuilder()
                newEmbed.setColor(oldEmbed.color)
                newEmbed.setDescription(actionText)
                let response = await interaction.reply({embeds: [newEmbed], withResponse: true })
                await oldMessage.delete()
                this.participants.set(interaction.user.id, {
                    team: part.team,
                    role: role,
                    message: response.resource.message.id
                })
            }
            return
        } else {
            let embed = new Discord.EmbedBuilder()
            for (const team of Object.values(this.teams)) {
                if (interaction.member.roles.cache.has(team.discord.role)) {
                    embed.setColor(Discord.resolveColor(team.colour))
                    embed.setDescription(actionText)
                    let response = await interaction.reply({embeds: [embed], withResponse: true })
                    this.participants.set(interaction.user.id, {
                        team: team.id,
                        role: role,
                        message: response.resource.message.id
                    })
                    return
                }
            }
            embed.setColor(Discord.Colors.Red)
            embed.setTitle("You are not in a team!")
            embed.setDescription("Please join a team before trying to join in.")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
        }
    }

    async updateEvent(text: string) {
        for (const team of Object.values(this.teams)) {
            let {channel, message, components} = await this.getTeamMessageAndComponent(team)
            let newComps: Discord.ContainerBuilder = components[0]

            if (newComps.components[7]) {
                newComps.spliceComponents(7, 1)
            }

            newComps.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(text)
            ])
            await message.edit({components: [newComps]})
        }
    }

    async finishEvent() {
        for (const team of Object.values(this.teams)) {
            let {channel, message, components} = await this.getTeamMessageAndComponent(team)
            let newComps: Discord.ContainerBuilder = components[0]
            if (newComps.components[7]) {
                newComps.spliceComponents(7, 1)
            }

            newComps.components[6].components[0].setDisabled(true)
            newComps.components[6].components[1].setDisabled(true)
            newComps.components[6].components[2].setDisabled(true)

            newComps.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent("The battle has ended...")
            ])
            await message.edit({components: [newComps]})

            // Add logic for calculating winner here
            let ratios: Discord.Collection = new Discord.Collection()
            ratios.set("gather", 0)
            ratios.set("throw", 0)
            ratios.set("shield", 0)
            let roleGap = 0
            let playerCount = 0
            for (const entry of this.participants.values()) {
                if (entry.team === team.id) {
                    ratios.set(entry.role, ratios.get(entry.role) + 1)
                    playerCount += 1
                }
            }

            if (playerCount === 0) {
                let resultMessage = new Discord.ContainerBuilder()
                    .setAccentColor(Discord.resolveColor(team.colour))
                    .addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`# Defeat!`),
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(this.currentBoss.results.uncontested.replaceAll("{name}", team.name))
                    ])
                let sentMessage = await channel.send({
                    components: [resultMessage],
                    flags: [Discord.MessageFlags.IsComponentsV2]
                })
                return
            }

            let sortedRatios = ratios.values().toArray().sort()
            console.log(sortedRatios)
            roleGap = Math.abs(sortedRatios[0] - sortedRatios[sortedRatios.length - 1])
            console.log(roleGap)

            let resultText = "Defeat"
            let resultDesc = this.currentBoss.results.defeat.replaceAll("{name}", team.name)

            if (ratios.get("gather") === 0 && ratios.get("gather") === 0) {
                resultDesc = this.currentBoss.results.allShield.replaceAll("{name}", team.name)
                this.log(`All players went with Shield => Defeat`)
            } else if (ratios.get("shield") === 0 && ratios.get("throw") === 0) {
                resultDesc = this.currentBoss.results.allGather.replaceAll("{name}", team.name)
                this.log(`All players went with Gather => Defeat`)
            } else if (ratios.get("shield") === 0 && ratios.get("gather") === 0) {
                resultDesc = this.currentBoss.results.allThrow.replaceAll("{name}", team.name)
                this.log(`All players went with Throw => Defeat`)
            } else {
                let roll = Math.round(Math.random()*100)
                let modifier = Math.max(30 - ((roleGap + (10 - playerCount)) * 4), 0)

                if (roll + modifier >= this.currentBoss.difficulty) {
                    resultText = "Victory"
                    resultDesc = this.currentBoss.results.victory.replaceAll("{name}", team.name)
                }

                this.log(`Player Count: ${this.bot.chalk.blue(playerCount)} + Role Gap: ${this.bot.chalk.blue(roleGap)} => Modifier ${this.bot.chalk.blue(modifier)}`)
                this.log(`Roll: ${this.bot.chalk.yellow(roll)}(+${this.bot.chalk.blue(modifier)}) => ${resultText}`)
            }

            let resultMessage = new Discord.ContainerBuilder()
                .setAccentColor(Discord.resolveColor(team.colour))
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# ${resultText}!`),
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(resultDesc)
                ])
                .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)

                let userList = ""

            for (let userId of this.participants.keys()) {
                if (this.participants.get(userId)?.team === team.id) {
                    let user = await channel.guild.members.fetch(userId)
                    userList += `- ${user.displayName} (${this.participants.get(userId)!.role})\n`
                }
            }

            resultMessage.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`## Combatants \n ${userList}`)
            ])
            let sentMessage = await channel.send({
                components: [resultMessage],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }
    }
}