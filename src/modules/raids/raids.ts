import {ERaidsCharacteristics, ERaidsClasses, ERaidsRoundOptionType, RaidsData, RaidsRound} from "./datatypes.js";
import RaidsModule from "./module.js";
// @ts-ignore
import * as Discord from "discord.js";
import TeamsModule from "../teams/module.js";
import TwitchModule from "../twitch/module.js";
import {RaidsClassData} from "./data/classes.js";

export class RaidsCampaign extends RaidsData {
    module: RaidsModule
    name = "Undefined Campaign"
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

    constructor(module: RaidsModule) {
        super()
        this.module = module
        this.userStats.set("110838934644211712", {
            class: ERaidsClasses.Warrior,
            team: 0,
            isHero: false,
            choices: []
        })
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

    async messageToAllTeams(message: Discord.ContainerBuilder) {
        try {
            for (let team of this.teams!.currentTeams.values()) {
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

    async startCampaign() {
        this.teams = await this.module.bot.requireModule("teams", TeamsModule)
        this.twitch = await this.module.bot.requireModule("twitch", TwitchModule)

        this.log("Campaign Starting...")
        if (this.encounters.length === 0) {
            this.log("No Encounters found! Cancelling Campaign")
            return
        }

        await this.messageToAllTeams(this.createCampaignStartMessage())
        setTimeout(async () => {await this.encounters[this.encounterIndex].startEncounter()}, 2000)

        this.updateTimer = setInterval(this.checkForUpdate.bind(this), 5000)
    }

    async endCampaign() {
        this.log(`Ending Campaign...`)
        clearInterval(this.updateTimer)
        await this.messageToAllTeams(this.createCampaignEndMessage())
        this.log(`Campaign Ended`)
        delete this.module.campaign
    }

    async checkForUpdate () {
        let encounter = this.encounters[this.encounterIndex]
        if (encounter.complete) {
            await encounter.endEncounter() // End existing encounter

            // If next encounter exists, start it, else end campaign
            if (this.encounters.length > (this.encounterIndex + 1)) {
                this.encounterIndex += 1
                await this.encounters[this.encounterIndex].startEncounter()
            } else {
                await this.endCampaign()
            }
        }
    }

    createCampaignStartMessage() {
        return this.module.bot.embeds.generic(
            this.name,
            "*A new campaign is about to begin...*",
            "Prepare yourselves for the first encounter soon!"
        )
    }

    createCampaignEndMessage() {
        return this.module.bot.embeds.generic(
            "The Campaign has ended...",
            "",
            "Thank you for playing!"
        )
    }
}

export class RaidsEncounter extends RaidsData {
    campaign: RaidsCampaign
    name = "Undefined Encounter"
    texts = {
        title: "",
        introduction: ""
    }
    rounds: Array<RaidsRound> = []
    currentRoundIndex: number = -1
    complete = false
    roundId: number = -1
    acceptingInput = false
    interactionCache: Discord.Collection<Discord.Snowflake, Discord.StringSelectMenuInteraction> = new Discord.Collection()

    constructor(campaign: RaidsCampaign) {
        super()
        this.campaign = campaign
    }

    log(...args: any[]) {
        this.campaign.subLog(this.campaign.module.bot.chalk.green(this.name), ...args)
    }

    getCurrentRound() {
        return this.rounds[this.currentRoundIndex]
    }

    async startEncounter() {
        this.log(`Starting Encounter`)
        await this.campaign.messageToAllTeams(this.createEncounterStartMessage())
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
        this.roundId = Math.round(Math.random()*100000)
        this.currentRoundIndex += 1
        await this.campaign.messageToAllTeams(this.createRoundStartMessage())
        this.log(this.campaign.module.bot.chalk.bgGreenBright(`Round ${this.currentRoundIndex+1} Started`))
        this.acceptingInput = true
        setTimeout(async () => {
            await this.endRound()
        }, 10 * 1000)
    }

    async endRound() {
        this.acceptingInput = false
        await this.campaign.messageToAllTeams(this.campaign.module.bot.embeds.generic(
            this.getCurrentRound().texts.preResult,
            `Round ${this.currentRoundIndex + 1} - ${this.getCurrentRound().name}`
        ))
        this.log(this.campaign.module.bot.chalk.bold.whiteBright("=== START OF RESULTS ==="))
        for (let userId of this.campaign.userStats.keys()) {
            let user = this.campaign.userStats.get(userId)
            let userDiscord = await this.campaign.module.client.users.fetch(userId)

            if (!user.choices[this.campaign.encounterIndex]
            || !user.choices[this.campaign.encounterIndex][this.currentRoundIndex]) {
                this.log(this.campaign.module.bot.chalk.italic.yellow(`${userDiscord.displayName}: N/A`))
                continue
            }

            let option = this.getCurrentRound().options[user.choices[this.campaign.encounterIndex][this.currentRoundIndex].choiceIndex]
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
                this.log(this.campaign.module.bot.chalk.italic.greenBright(`${userDiscord.displayName} (${RaidsClassData[user.class as ERaidsClasses].name}): ${description}`))
            } else {
                this.log(this.campaign.module.bot.chalk.italic.redBright(`${userDiscord.displayName} (${RaidsClassData[user.class as ERaidsClasses].name}): ${description}`))
            }

            let interaction = this.interactionCache.get(userId)
            if (interaction) {
                let message
                if (success) {
                    message = this.campaign.module.bot.embeds.success(
                        option.texts.pass,
                        description
                    )
                } else {
                    message = this.campaign.module.bot.embeds.failure(
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
        this.log(this.campaign.module.bot.chalk.bold.whiteBright("=== END OF RESULTS ==="))
        await this.campaign.messageToAllTeams(this.campaign.module.bot.embeds.generic(
            this.rounds[this.currentRoundIndex].texts.postResult,
            `Round ${this.currentRoundIndex + 1} - ${this.getCurrentRound().name}`
        ))
        this.interactionCache.clear()
        this.log(this.campaign.module.bot.chalk.bgRedBright(`Round ${this.currentRoundIndex+1} Ended`))
        setTimeout(async () => {
            await this.startRound()
        }, 20*1000)
    }

    createEncounterStartMessage() {
        return this.campaign.module.bot.embeds.generic(
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

        return this.campaign.module.bot.embeds.generic(
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