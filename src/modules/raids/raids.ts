import {ERaidsCharacteristics, ERaidsClasses, ERaidsRoundOptionType, RaidsData, RaidsRound} from "./datatypes.js";
import RaidsModule from "./module.js";
// @ts-ignore
import * as Discord from "discord.js";
import TeamsModule from "../teams/module.js";
import TwitchModule from "../twitch/module.js";
import {RaidsClassData} from "./data/classes.js";

export class RaidsRaid extends RaidsData {
    module: RaidsModule
    name = "Undefined Raid"
    encounters: Array<RaidsEncounter> = []
    encounterIndex = 0
    updateTimer: NodeJS.Timeout | undefined
    userStats: Discord.Collection<Discord.Snowflake, {
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
    }> = new Discord.Collection()
    teams: TeamsModule | undefined
    twitch: TwitchModule | undefined
    id = -1
    overlayData: {
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
            start?: Date,
            end?: Date
        }
    } = {
        bossBar: {
            mode: "None",
            percentages: {}
        },
        messages: {},
        timer: {
            mode: "None",
        }
    }

    constructor(module: RaidsModule, id: number) {
        super()
        this.module = module
        this.id = id
        // this.userStats.set("110838934644211712", {
        //     class: ERaidsClasses.Warrior,
        //     team: 0,
        //     isHero: false,
        //     choices: []
        // })
    }

    log(...args: any[]) {
        this.module.log(`[${this.module.bot.chalk.cyan(this.name)}]`, ...args)
    }

    subLog(source: string, ...args: any[]) {
        this.module.log(`[${this.module.bot.chalk.cyan(this.name)}/${this.module.bot.chalk.greenBright(source)}]`, ...args)
    }

    getCurrentEncounter() {
        return this.encounters[this.encounterIndex]
    }

    async updateUserData(userId: Discord.Snowflake) {
        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/user/fetch`, {
            method: "POST",
            body: JSON.stringify({
                "user_id": userId,
                "raid_id": this.id,
            }),
            headers: {"Content-type": "application/json"}
        })
        if (!res.ok) {
            this.log(`${this.module.bot.chalk.redBright("Failed to update user data of ID ")} ${this.module.bot.chalk.magenta(userId)}`)
            return
        }
        let data = await res.json()
        this.userStats.set(userId, data[0])
        this.log(`Updated user data of ID ${this.module.bot.chalk.magenta(userId)}`)
    }

    async messageToAllTeams(message: Discord.ContainerBuilder) {
        try {
            for await (let team of this.teams!.currentTeams.values()) {
                await team.channel.send({
                    content: null,
                    components: [message],
                    flags: [Discord.MessageFlags.IsComponentsV2]
                })
            }
        } catch (e) {
            this.log(e)
        }
    }

    async startRaid() {
        this.teams = await this.module.bot.requireModule("teams", TeamsModule)
        this.twitch = await this.module.bot.requireModule("twitch", TwitchModule)

        this.log("Raid Starting...")
        if (this.encounters.length === 0) {
            this.log("No Encounters found! Cancelling Raid")
            return
        }

        await this.messageToAllTeams(this.createRaidStartMessage())
        await this.messageToAllTeams(await this.module.embeds.classSelectionHeader(RaidsClassData))
        setTimeout(async () => {await this.encounters[this.encounterIndex].startEncounter()}, this.module.timings.classSelection * 60 * 1000)

        this.updateTimer = setInterval(this.checkForUpdate.bind(this), 5000)
    }

    async endRaid() {
        this.log(`Ending Raid...`)
        clearInterval(this.updateTimer)
        await this.messageToAllTeams(this.createRaidEndMessage())
        this.log(`Raid Ended`)
        delete this.module.raid
    }

    async checkForUpdate () {
        let encounter = this.encounters[this.encounterIndex]
        if (encounter.complete) {
            await encounter.endEncounter() // End existing encounter

            // If next encounter exists, start it, else end raid
            if (this.encounters.length > (this.encounterIndex + 1)) {
                this.encounterIndex += 1
                setTimeout(async () => {
                    await this.encounters[this.encounterIndex].startEncounter()
                }, this.module.timings.nextEncounter * 60 * 1000)
            } else {
                setTimeout(async () => {
                    await this.endRaid()
                }, this.module.timings.endRaid * 60 * 1000)

            }
        }
    }

    createRaidStartMessage() {
        return this.module.bot.embeds.generic(
            this.name,
            "*A new raid is about to begin...*",
            `Prepare yourselves for the first encounter ${Discord.time(new Date(Date.now() + (this.module.timings.classSelection * 60 * 1000)), Discord.TimestampStyles.RelativeTime)}`
        )
    }

    createRaidEndMessage() {
        return this.module.bot.embeds.generic(
            "The Raid has ended...",
            "",
            "Thank you for playing!"
        )
    }
}

export class RaidsEncounter extends RaidsData {
    raid: RaidsRaid
    name = "Undefined Encounter"
    texts = {
        title: "",
        introduction: ""
    }
    rounds: Array<RaidsRound> = []
    currentRoundIndex: number = -1
    complete = false
    roundId: string = ""
    acceptingInput = false
    interactionCache: Discord.Collection<Discord.Snowflake, Discord.StringSelectMenuInteraction> = new Discord.Collection()

    constructor(raid: RaidsRaid) {
        super()
        this.raid = raid
    }

    log(...args: any[]) {
        this.raid.subLog(this.raid.module.bot.chalk.green(this.name), ...args)
    }

    getCurrentRound() {
        return this.rounds[this.currentRoundIndex]
    }

    async startEncounter() {
        this.log(`Starting Encounter`)
        await this.raid.messageToAllTeams(this.createEncounterStartMessage())
        await this.startRound()
    }

    async endEncounter() {
        this.log(`Ending Encounter`)
    }

    async startRound() {
        if (this.rounds.length <= this.currentRoundIndex + 1) {
            this.complete = true
            return
        }

        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/update`, {
            method: "POST",
            body: JSON.stringify({
                token: process.env.API_TOKEN,
                raid_id: this.raid.id,
                encounterIndex: this.raid.encounterIndex,
                roundIndex: this.currentRoundIndex
            }),
            headers: {"Content-type": "application/json"}
        })
        // if (res.ok) {
        //     let data = await res.json()
        //     if (data && data.length > 0) {
        //         this.raid = new TestRaid(this, data.id)
        //         await this.raid.startRaid()
        //         return true
        //     }
        //     return false
        // } else {
        //     this.log("Failed to fetch raid data.")
        //     return false
        // }

        this.currentRoundIndex += 1
        this.roundId = `${this.raid.id}-${this.raid.encounterIndex}-${this.currentRoundIndex}`

        await this.raid.messageToAllTeams(this.createRoundStartMessage())
        this.log(this.raid.module.bot.chalk.bgGreenBright(`Round ${this.currentRoundIndex+1} Started`))

        this.acceptingInput = true

        setTimeout(async () => {
            await this.endRound()
        }, this.raid.module.timings.actionSelection * 60 * 1000)
    }

    async endRound() {
        this.acceptingInput = false
        await this.raid.messageToAllTeams(this.raid.module.bot.embeds.generic(
            this.getCurrentRound().texts.preResult,
            `Round ${this.currentRoundIndex + 1} - ${this.getCurrentRound().name}`
        ))
        this.log(this.raid.module.bot.chalk.bold.whiteBright("=== START OF RESULTS ==="))
        for await (let userId of this.raid.userStats.keys()) {
            let user = this.raid.userStats.get(userId)
            let userDiscord = await this.raid.module.client.users.fetch(userId)

            if (user.choices.length === 0
                || !user.choices[this.raid.encounterIndex]
                || !user.choices[this.raid.encounterIndex][this.currentRoundIndex])
            {
                this.log(this.raid.module.bot.chalk.italic.yellow(`${userDiscord.displayName}: N/A`))
                continue
            }

            let option = this.getCurrentRound().options[user.choices[this.raid.encounterIndex][this.currentRoundIndex].choiceIndex]
            let success = false
            let description = "FAILURE"
            switch (option.type) {
                case ERaidsRoundOptionType.SkillCheck:
                    let roll = Math.ceil(Math.random()*20)
                    description = `Roll: ${roll}`

                    let rollModifier = RaidsClassData[user.class as ERaidsClasses].modifiers[option.characteristic]
                    let universalModifier = RaidsClassData[user.class as ERaidsClasses].modifiers[ERaidsCharacteristics.Universal]
                    let combinedModifier = rollModifier + universalModifier
                    if (combinedModifier > 0) {
                        description += ` (+${combinedModifier})`
                    } else if (combinedModifier < 0) {
                        description += ` (${combinedModifier})`
                    }

                    success = (roll + combinedModifier) >= option.difficulty
                    description += ` VS ${option.difficulty} => ${success ? "SUCCESS" : "FAILURE"}`
                    break;
                case ERaidsRoundOptionType.AutoPass:
                    success = true
                    description = "SUCCESS"
                    break;
            }

            if (success) {
                this.log(this.raid.module.bot.chalk.italic.greenBright(`${userDiscord.displayName} (${RaidsClassData[user.class as ERaidsClasses].name}): ${description}`))
            } else {
                this.log(this.raid.module.bot.chalk.italic.redBright(`${userDiscord.displayName} (${RaidsClassData[user.class as ERaidsClasses].name}): ${description}`))
            }

            let interaction = this.interactionCache.get(userId)
            if (interaction) {
                let message
                if (success) {
                    message = this.raid.module.bot.embeds.success(
                        option.texts.pass,
                        description
                    )
                } else {
                    message = this.raid.module.bot.embeds.failure(
                        option.texts.fail,
                        description
                    )
                }

                await interaction.followUp({
                    content: null,
                    components: [message],
                    flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                })
            }
        }
        this.log(this.raid.module.bot.chalk.bold.whiteBright("=== END OF RESULTS ==="))
        await this.raid.messageToAllTeams(this.raid.module.bot.embeds.generic(
            this.rounds[this.currentRoundIndex].texts.postResult,
            `Round ${this.currentRoundIndex + 1} - ${this.getCurrentRound().name}`
        ))
        this.interactionCache.clear()
        this.log(this.raid.module.bot.chalk.bgRedBright(`Round ${this.currentRoundIndex+1} Ended`))
        setTimeout(async () => {
            await this.startRound()
        }, this.raid.module.timings.nextRound * 60 * 1000)
    }

    createEncounterStartMessage() {
        return this.raid.module.bot.embeds.generic(
            this.texts.title,
            "",
            this.texts.introduction
        )
    }

    createRoundStartMessage() {
        let options = []
        let optionsData = this.rounds[this.currentRoundIndex].options
        for (let optionIndex in optionsData) {
            let option = new Discord.StringSelectMenuOptionBuilder()
                .setLabel(optionsData[optionIndex].texts.selection)
                .setValue(`${optionIndex}`)
                .setEmoji(optionsData[optionIndex].emoji)

            if (optionsData[optionIndex].type === ERaidsRoundOptionType.SkillCheck) {
                let optionDesc = ""
                optionDesc += `Difficulty: ${optionsData[optionIndex].difficulty}`
                if (optionsData[optionIndex].characteristic !== ERaidsCharacteristics.Universal) {
                    optionDesc += `  ( ${ERaidsCharacteristics[optionsData[optionIndex].characteristic]} )`
                }
                option.setDescription(optionDesc)
            }
            options.push(option)
        }

        return this.raid.module.bot.embeds.generic(
            this.getCurrentRound().texts.opening,
            `Round ${this.currentRoundIndex + 1} - ${this.getCurrentRound().name}`
        ).addActionRowComponents((actionRow: Discord.ActionRowBuilder) => actionRow
            .addComponents([
                new Discord.StringSelectMenuBuilder()
                    .setCustomId(`raids-encounter-${this.roundId}`)
                    .setRequired(true)
                    .setOptions(options)
                    .setPlaceholder("Select an Action.")
            ])
        )
    }
}