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
        this.module.eventLog([this.bot.chalk.greenBright(this.name)], ...args);
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

    async submitResult(interaction: Discord.Interaction, teamId: number, reward: number) {
        let embed = new Discord.EmbedBuilder()
        if (this.scores.teams[teamId].AnswerUsers.includes(interaction.user.id)) {
            // DUPLICATE ANSWER
            embed.setColor(Discord.Colors.Red)
            embed.setTitle("You have already answered this question!")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
        } else if (reward !== 0) {
            // CORRECT ANSWER
            let editResponse = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/score", {
                method: "POST",
                body: JSON.stringify({
                    "token": process.env.API_TOKEN as string,
                    "user_name": interaction.user.username,
                    "user_id": interaction.user.id,
                    "id": teamId,
                    "score": reward,
                    "reason": `${interaction.user.username} completed the event ${this.name}`
                }),
                headers: {"Content-type": "application/json"}
            })

            if (editResponse.ok) {
                // SUCCESS
                this.scores.teams[teamId].AnswerUsers.push(interaction.user.id)
                this.scores.teams[teamId].CorrectUsers.push(interaction.user.id)
                this.scores.globalAnswerCount += 1
                this.scores.globalCorrectCount += 1

                this.log(`Correct answer from ${interaction.user.username}`)
                embed.setColor(Discord.Colors.Green)
                embed.setTitle("Thank you for your answer!")
                await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
            } else {
                // FAILED
                this.log(`Failed to log answer for ${interaction.user.username}`)
                embed.setColor(Discord.Colors.Red)
                embed.setTitle("Something went wrong submitting your answer. Please Try Again!")
            }
        } else {
            // INCORRECT ANSWER
            this.scores.teams[teamId].AnswerUsers.push(interaction.user.id)
            this.scores.globalAnswerCount += 1

            this.log(`Incorrect answer from ${interaction.user.username}`)
            embed.setColor(Discord.Colors.Green)
            embed.setTitle("Thank you for your answer!")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
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

    resetScores() {
        this.scores = {
            globalAnswerCount: 0,
            globalCorrectCount: 0,
            teams: {}
        }
    }
}