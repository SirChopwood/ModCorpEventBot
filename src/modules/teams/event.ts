import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {Team} from "./teams";

export default class TeamsEvent {
    name = "trivia"
    desc = "A simple multiple choice question."
    bot: DiscordBot
    constructor(bot: DiscordBot) {
        this.bot = bot
    }
    async prepareEvent() {

    }
    async triggerEvent(team: Team, guild: Discord.Guild, channel: Discord.GuildTextBasedChannel) {
    }
    async onInteraction(interaction: Discord.Interaction) {
    }
    getMessageHeader(team: Team){
        return new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor(team.colour))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# ${this.name}\nTeam ${team.name}`)
                ])
                .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                    .setURL(team.logo_url)
                )
            )
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
    }
}