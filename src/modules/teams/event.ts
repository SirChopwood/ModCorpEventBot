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
    teamRefs: Record<string, {
        guild: Discord.Guild,
        channel: Discord.GuildTextBasedChannel,
        role: Discord.Role,
        messages: Record<string, Discord.Snowflake>
        components: Record<Discord.Snowflake, Array<Discord.Component>>
    }> = {}
    teams: Record<string, Team> = {}


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
        this.commandName = this.name.toLowerCase().replaceAll(" ", "")
    }

    log(...args: any[]) {
        this.module.subLog([this.bot.chalk.redBright(this.name)], ...args);
    }

    async prepareEvent() {
        this.log(`Executing ${this.bot.chalk.bold(this.name)} Event`)
        const eventDuration = Number(process.env.TEAMS_EVENT_DURATION) | 60000
        setTimeout(this.updateEvent.bind(this), eventDuration - 30000, "30s remaining!")
        setTimeout(this.updateEvent.bind(this), eventDuration - 10000, "10s remaining!")
        setTimeout(this.finishEvent.bind(this), eventDuration)
    }

    async triggerEvent(team: Team) {
        if (!(team.discord.server && team.discord.channel && team.discord.role)) {return}
        this.teams[team.id] = team


        const teamGuild = await this.module.client.guilds.fetch(team.discord.server)
        if (!teamGuild) {return}

        const teamChannel = await teamGuild.channels.fetch(team.discord.channel)
        if (!teamChannel) {return}

        const teamRole = teamGuild.roles.fetch(team.discord.role)
        if (!teamRole) {return}

        this.teamRefs[team.id] = {
            guild: teamGuild,
            channel: teamChannel,
            role: teamRole,
            messages: {},
            components: {}
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
    }

    async updateEvent(text: string) {
        this.log(text)
    }

    async finishEvent() {
        this.log("Event Concluded")
    }

    async getTeamMessageAndComponent(team: Team) {
        let messageId = this.teamRefs[team.id].messages["Main"]
        let channel = this.teamRefs[team.id].channel
        let oldMessage = await channel.messages.fetch(messageId)
        let comps = this.teamRefs[team.id].components[messageId]
        return {
            channel: channel,
            message: oldMessage,
            components: comps
        }
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