import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {ERaidsClasses} from "./datatypes.js";
import {RaidsCampaign} from "./raids.js";
import {TestCampaign} from "./data/testraid.js";
import TwitchModule from "../twitch/module.js";
import TeamsModule from "../teams/module.js";

export default class RaidsModule extends DiscordBotModule {
    twitch: TwitchModule | undefined
    teams: TeamsModule | undefined
    campaign: RaidsCampaign | undefined

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Raids",
            desc: "Interactive Raids on Discord & Twitch.",
            colour: "blueBright"
        })
    }

    async initialise(): Promise<void> {
        await super.initialise();

        setTimeout(async () => {
            this.campaign = new TestCampaign(this)
            await this.campaign.startCampaign()
        }, 2000)
    }

    override async postInit(): Promise<void> {
        this.twitch = await this.bot.requireModule("twitch", TwitchModule)
        this.teams = await this.bot.requireModule("teams", TeamsModule)

        await super.postInit();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}