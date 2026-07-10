import {
    ERaidsCharacteristics,
    ERaidsClasses,
    ERaidsRoundOptionType,
    RaidsData, RaidsOverlayData,
    RaidsRound,
    RaidsUserData
} from "./datatypes.js";
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
    userStats: Discord.Collection<Discord.Snowflake, RaidsUserData> = new Discord.Collection()
    teams: TeamsModule | undefined
    twitch: TwitchModule | undefined
    id = -1
    overlayData: RaidsOverlayData = {
        bossBar: {
            mode: "None",
            percentages: {}
        },
        messages: {},
        timer: {
            mode: "None",
        }
    }
    choiceTemplate: Array<Array<{
        success: boolean,
        choiceIndex: number,
        roll: number
    }>> = []

    constructor(module: RaidsModule, id: number, encounterIndex?: number, roundIndex?: number) {
        super()
        this.module = module
        this.id = id
        if (encounterIndex) {
            this.encounterIndex = encounterIndex
            if (roundIndex) {
                this.encounters[encounterIndex].currentRoundIndex = roundIndex - 1
            }
        }
    }

    log(...args: any[]) {
        this.module.log(`[${this.module.bot.chalk.cyan(this.name)}]`, ...args)
    }

    subLog(source: string, ...args: any[]) {
        this.module.log(`[${this.module.bot.chalk.cyan(this.name)}/${this.module.bot.chalk.greenBright(source)}]`, ...args)
    }

    async initialise() {
        this.choiceTemplate = []
        for (let encounter of this.encounters) {
            let rounds = []
            for (let round of encounter.rounds) {
                rounds.push({
                    success: false,
                    choiceIndex: -1,
                    roll: -1
                })
            }
            this.choiceTemplate.push(rounds)
        }
        await this.updateAllUserData()
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
            return false
        }
        let data = await res.json()
        this.userStats.set(userId, data[0])
        this.log(`Updated user data of ID ${this.module.bot.chalk.magenta(userId)}`)
        return true
    }

    async updateAllUserData() {
        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/user/fetch`, {
            method: "POST",
            body: JSON.stringify({
                raid_id: this.id,
            }),
            headers: {"Content-type": "application/json"}
        })
        if (res.ok) {
            let data = await res.json() as Array<RaidsUserData>
            if (data) {
                if (data.length > 0) {
                    this.log(`Data found for ${data.length} users.`)
                    for (let user of data) {
                        this.userStats.set(user.user_id, user)
                    }
                } else {
                    this.log("No existing user data found.")
                }
                return true
            }
            return false
        } else {
            this.log("Failed to fetch raid user data.")
            return false
        }
    }

    async updateOverlay(data: Partial<RaidsOverlayData>) {
        Object.assign(this.overlayData, data)
        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/overlay`, {
            method: "POST",
            body: JSON.stringify({
                token: process.env.API_TOKEN,
                raid_id: this.id,
                bossBar: this.overlayData.bossBar,
                messages: this.overlayData.messages,
                timer: this.overlayData.timer
            }),
            headers: {"Content-type": "application/json"}
        })
        return res.ok
    }

    async messageToAllTeams(message: Discord.ContainerBuilder) {
        let messages: Array<Discord.Message> = []
        for await (let team of this.teams!.currentTeams.values()) {
            messages.push(await team.channel.send({
                content: null,
                components: [message],
                flags: [Discord.MessageFlags.IsComponentsV2]
            }))
        }
        return messages
    }

    async startRaid() {
        this.teams = await this.module.bot.requireModule("teams", TeamsModule)
        this.twitch = await this.module.bot.requireModule("twitch", TwitchModule)

        if (this.encounterIndex > 0) {
            await this.encounters[this.encounterIndex].startEncounter()
        }
        this.log("Raid Starting...")
        if (this.encounters.length === 0) {
            this.log("No Encounters found! Cancelling Raid")
            return
        }

        await this.messageToAllTeams(this.createRaidStartMessage())
        await this.messageToAllTeams(await this.module.embeds.classSelectionHeader(RaidsClassData))
        await this.updateOverlay({
            messages: {
                title: this.name,
                subtitle: "Raid Starting"
            },
            timer: {
                mode: "Encounter",
                start: new Date(Date.now()),
                end: new Date(Date.now() + this.module.timings.classSelection * 60 * 1000)
            }
        })

        setTimeout(async () => {
            await this.encounters[this.encounterIndex].startEncounter()
        }, this.module.timings.classSelection * 60 * 1000)

        this.updateTimer = setInterval(this.checkForUpdate.bind(this), 5000)
    }

    async endRaid() {
        this.log(`Ending Raid...`)
        clearInterval(this.updateTimer)
        await this.messageToAllTeams(this.createRaidEndMessage())
        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/update`, {
            method: "POST",
            body: JSON.stringify({
                token: process.env.API_TOKEN,
                raid_id: this.id,
                encounterIndex: this.encounterIndex,
                roundIndex: -1,
                active: false
            }),
            headers: {"Content-type": "application/json"}
        })
        if (!res.ok) {
            this.log("Failed to update raid data.")
        }
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
                await this.endRaid()
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
    roundStartContainer: Discord.ContainerBuilder | undefined
    roundStartMessages: Array<Discord.Message> = []

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
        await this.raid.updateOverlay({
            messages: {
                title: this.texts.title,
                subtitle: `Encounter ${this.raid.encounterIndex + 1}`
            },
            timer: {
                mode: "Encounter",
                start: new Date(Date.now()),
                end: new Date(Date.now() + this.raid.module.timings.actionSelection * 60 * 1000)
            }
        })
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

        this.currentRoundIndex += 1
        this.roundId = `${this.raid.id}-${this.raid.encounterIndex}-${this.currentRoundIndex}`

        this.roundStartMessages = await this.raid.messageToAllTeams(this.createRoundStartMessage())
        this.roundStartContainer = this.createRoundStartMessage(true)
        this.log(this.raid.module.bot.chalk.bgGreenBright(`Round ${this.currentRoundIndex+1} Started`))

        this.acceptingInput = true

        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/update`, {
            method: "POST",
            body: JSON.stringify({
                token: process.env.API_TOKEN,
                raid_id: this.raid.id,
                encounterIndex: this.raid.encounterIndex,
                roundIndex: this.currentRoundIndex,
                active: true
            }),
            headers: {"Content-type": "application/json"}
        })
        if (!res.ok) {
            this.log("Failed to update raid data.")
        }

        setTimeout(async () => {
            await this.endRound()
        }, this.raid.module.timings.actionSelection * 60 * 1000)
    }

    async endRound() {
        this.acceptingInput = false
        for (let message of this.roundStartMessages) {
            await message.edit({
                components: [this.roundStartContainer],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }

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
                    user.choices[this.raid.encounterIndex][this.currentRoundIndex].roll = roll

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
                    user.choices[this.raid.encounterIndex][this.currentRoundIndex].success = success
                    break;
                case ERaidsRoundOptionType.AutoPass:
                    success = true
                    user.choices[this.raid.encounterIndex][this.currentRoundIndex].success = true
                    description = "SUCCESS"
                    break;
            }

            if (success) {
                this.log(this.raid.module.bot.chalk.italic.greenBright(`${userDiscord.displayName} (${RaidsClassData[user.class as ERaidsClasses].name}): ${description}`))
            } else {
                this.log(this.raid.module.bot.chalk.italic.redBright(`${userDiscord.displayName} (${RaidsClassData[user.class as ERaidsClasses].name}): ${description}`))
            }

            await this.raid.updateUserData(userId)

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

    createRoundStartMessage(disabled = false): Discord.ContainerBuilder {
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
                    .setDisabled(disabled)
            ])
        )
    }
}