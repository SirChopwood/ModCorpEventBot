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
    scores: {
        globalAnswerCount: number
        globalCorrectCount: number
        teams: Record<string, {
            AnswerUsers: Array<Discord.Snowflake>
            CorrectUsers: Array<Discord.Snowflake>
        }>
    }= {
        globalAnswerCount: 0,
        globalCorrectCount: 0,
        teams: {}
    }
    teamRefs: Record<string, {
        guild: Discord.Guild,
        channel: Discord.GuildTextBasedChannel,
        role: Discord.Role,
        messages: Record<string, Discord.Snowflake>
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
        this.commandName = this.name.toLowerCase().replace(" ", "")
        this.resetScores()
    }

    log(...args: any[]) {
        this.module.eventLog([this.name], ...args);
    }

    async prepareEvent() {
        this.log(`Executing ${this.name} Event`)
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
            messages: {}
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
    }

    async updateEvent(text: string) {
    }

    async finishEvent() {
        this.log("Event Concluded")
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

    resetScores() {
        this.scores = {
            globalAnswerCount: 0,
            globalCorrectCount: 0,
            teams: {}
        }
    }
}