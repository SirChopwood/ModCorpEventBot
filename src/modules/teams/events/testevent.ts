import TeamsModule from "../module";
import TeamClass from "../team";
// @ts-ignore
import * as Discord from "discord.js";
import TeamsEvent from "../event.js";
import * as module from "node:module";

export default class TestTeamsEvent extends TeamsEvent {
    name = "Test Event Name"
    description = "Some sort of a description..."

    constructor(module: TeamsModule) {
        super(module)
    }

    async prepareGlobal() {
        await super.prepareGlobal()
        console.log("child", this.name, this.description)
    }
}