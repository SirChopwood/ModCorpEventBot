import TeamsModule from "./module";
import TeamClass from "./team";
// @ts-ignore
import * as Discord from "discord.js";

export interface TeamsEventType extends TeamsEvent {
    [index: string]: any
}

export default class TeamsEvent {
    module: TeamsModule
    name = "Undefined Event Name"
    description = "Undefined Event Description."
    instructions = "Do nothing."
    commandName: string = ""

    constructor(module: TeamsModule) {
        this.module = module
    }

    // Call immediately after construct
    async initialise() {
        this.commandName = this.name.toLowerCase().replaceAll(" ", "")
    }

    // Call to properly Prepare the Event to begin
    async prepareEvent() {
        await this.prepareGlobal()
        for await (let team of this.module.currentTeams.values()) {
            await this.prepareTeam(team)
        }
    }

    // Call to properly Start the Event
    async startEvent() {
        await this.startGlobal()
        for await (let team of this.module.currentTeams.values()) {
            await this.startTeam(team)
        }
    }

    // Call to properly End the Event
    async endEvent() {
        await this.endGlobal()
        for await (let team of this.module.currentTeams.values()) {
            await this.endTeam(team)
        }
    }


    // Called when the event is selected with global context
    async prepareGlobal() {
        this.module.log(`Preparing Event ${this.module.bot.chalk.greenBright(this.name)}${this.module.bot.chalk.grey(' - ' + this.description)}`)
    }

    // Called when the event is selected per team involved
    async prepareTeam(team: TeamClass) {
    }

    // Called when the event begins
    async startGlobal() {
        this.module.log(`Starting Event ${this.module.bot.chalk.greenBright(this.name)}`)
    }

    // Called when the event begins for each team involved
    async startTeam(team: TeamClass) {
    }

    // Called when the event ends
    async endGlobal() {
        this.module.log(`Ending Event ${this.module.bot.chalk.greenBright(this.name)}`)
    }

    // Called when the event ends for each team involved
    async endTeam(team: TeamClass) {
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
    }
}