import {RaidsRound, RaidsData, ERaidsClasses} from "./datatypes.js";
import RaidsModule from "./module.js";
// @ts-ignore
import * as Discord from "discord.js";
import TeamsModule from "../teams/module.js";
import TwitchModule from "../twitch/module.js";
import TeamClass from "../teams/team";

export class RaidsCampaign extends RaidsData {
    module: RaidsModule
    name = "Undefined Campaign"
    encounters: Array<RaidsEncounter> = []
    encounterIndex = 0
    updateTimer: NodeJS.Timeout | undefined
    userStats: Discord.Collection<Discord.Snowflake, {
        class: ERaidsClasses,
        team: number,
        hasBeenHero: boolean,
        choices: Record<number, // Encounter Index
            Record<number, { // Round Index
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
    }

    log(...args: any[]) {
        this.module.log(`[${this.module.bot.chalk.cyan(this.name)}]`, ...args)
    }

    subLog(source: string, ...args: any[]) {
        this.module.log(`[${this.module.bot.chalk.cyan(this.name)}/${this.module.bot.chalk.greenBright(source)}]`, ...args)
    }

    async startCampaign() {
        this.teams = await this.module.bot.requireModule("teams", TeamsModule)
        this.twitch = await this.module.bot.requireModule("twitch", TwitchModule)

        this.log("Campaign Starting...")
        if (this.encounters.length === 0) {
            this.log("No Encounters found! Cancelling Campaign")
            return
        }

        for (let team of this.teams.currentTeams.values()) {
            await team.channel.send(this.createCampaignStartMessage())
        }
        setTimeout(async () => {await this.encounters[this.encounterIndex].startEncounter()}, 2000)

        this.updateTimer = setInterval(this.checkForUpdate.bind(this), 5000)
    }

    async endEncounter() {
        this.log(`Ending Campaign...`)
        clearInterval(this.updateTimer)
        for (let team of this.teams!.currentTeams.values()) {
            await team.channel.send(this.createCampaignStartMessage())
        }
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
                await this.endEncounter()
            }
        }
    }

    createCampaignStartMessage() {
        return `*A new campaign is about to begin...*\n# ${this.name}\n\n**Prepare yourselves for the first encounter soon!**`
    }

    createCampaignEndMessage() {
        return `# The Campaign has ended...\n### Thank you for playing!`
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
    currentRound: number | undefined
    complete = false

    constructor(campaign: RaidsCampaign) {
        super()
        this.campaign = campaign
        setTimeout(() => {
            this.complete = true
        }, 5000)
    }

    log(...args: any[]) {
        this.campaign.subLog(this.campaign.module.bot.chalk.green(this.name), ...args)
    }

    async startEncounter() {
        this.log(`Starting Encounter`)
    }

    async endEncounter() {
        this.log(`Ending Encounter`)
    }
}