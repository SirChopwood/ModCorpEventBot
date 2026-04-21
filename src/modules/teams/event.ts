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

    constructor(module: TeamsModule) {
        this.module = module
    }

    async prepareGlobal() {
        console.log("parent", this.name, this.description)
    }

    async prepareTeam(team: TeamClass) {
    }

    async startGlobal() {
    }

    async startTeam(team: TeamClass) {
    }

    async endGlobal() {
    }

    async endTeam(team: TeamClass) {
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
    }
}