import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {Team} from "./teams";
import {DiscordBotModuleType} from "../../module";
import TeamsEvent from "./event.js";
import TeamClass from "./team";

export default class TeamsEventQuestion extends TeamsEvent {
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


    constructor(bot: DiscordBot, module: DiscordBotModuleType, {
        name = "Event Name",
        desc = "A simple multiple choice question.",
        instructions = "How to play this particular event."
    }) {
        super(bot, module, {name, desc, instructions})
        this.resetScores()
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
            let editResponse = await fetch(`${process.env.API_HOST}/api/v1/modcorp/teams/score`, {
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

    resetScores() {
        this.scores = {
            globalAnswerCount: 0,
            globalCorrectCount: 0,
            teams: {}
        }
    }

    addTeam(team: TeamClass, message: Discord.Message) {
        this.scores.teams[team.id] = {
            AnswerUsers: [],
            CorrectUsers: []
        }
        this.teamRefs[team.id].messages["Main"] = message
    }
}