import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {Team} from "./teams";
import {DiscordBotModuleType} from "../../module";

export interface TeamsEventType extends TeamsEvent {
    [index: string]: any
}

export default class TeamsEvent {
    bot: DiscordBot
    module: DiscordBotModuleType
    name: string
    desc: string
    instructions: string
    commandName: string

    constructor(bot: DiscordBot, module: DiscordBotModuleType, {
        name = "Event Name",
        desc = "A simple multiple choice question.",
        instructions = "How to play this particular event."
    }) {
        this.bot = bot
        this.module = module
        this.name = name
        this.desc = desc
        this.instructions = instructions
        this.commandName = this.name.toLowerCase().replace(" ", "")
    }

    log(...args: any[]) {
        this.module.eventLog([this.name], ...args);
    }

    async prepareEvent() {
    }

    async triggerEvent(team: Team, guild: Discord.Guild, channel: Discord.GuildTextBasedChannel) {
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
    }

    getMessageHeader(team: Team){
        return new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor(team.colour))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# ${this.name}\n${this.instructions}`)
                ])
                .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                    .setURL(team.logo_url)
                )
            )
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
    }
}