// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
// @ts-ignore
import {GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet} from "google-spreadsheet";
import {DiscordBotModuleType} from "../../../module";

export default class TriviaQuestion extends TeamsEvent {
    currentQuestion: {
        author: string,
        reward: string,
        image: string | null,
        question: string,
        correctAnswer: string,
        correctAnswerValue: string
        shuffledAnswers: Array<string>,
        answeredUsers: Array<Discord.Snowflake>
    } | null = null

    constructor(bot: DiscordBot, module: DiscordBotModuleType) {
        super(bot, module, {
            name: "Trivia",
            desc: "A simple multiple choice question.",
            instructions: "Read and discuss the question, then select your answer from the dropdown below. You may each answer individually."
        })
    }

    async prepareEvent() {
        const doc: GoogleSpreadsheet = this.module.spreadsheet
        await doc.loadInfo()
        let sheet: GoogleSpreadsheetWorksheet = await doc.sheetsByIndex[0]
        await sheet.loadHeaderRow()
        let questionRows: GoogleSpreadsheetRow[] = await sheet.getRows({offset: (Math.floor(Math.random() * (sheet.rowCount-2))+1), limit: 1})
        const headers = sheet.headerValues
        const question = questionRows[0]
        let shuffledAnswers: Array<string> = [question.get(headers[4])]
        for (let column of [5,6,7,8,9,10]) {
            let answer = question.get(headers[column])
            if (answer) {
                shuffledAnswers.push(answer)
            }
        }
        this.shuffle(shuffledAnswers)
        this.currentQuestion = {
            author: question.get(headers[0]),
            reward: question.get(headers[1]),
            image: question.get(headers[2]),
            question: question.get(headers[3]),
            correctAnswer: question.get(headers[4]),
            correctAnswerValue: "",
            shuffledAnswers: shuffledAnswers,
            answeredUsers: []
        }
        this.log(`Executing Trivia Event`)
    }

    async triggerEvent(team: Team, guild: Discord.Guild, channel: Discord.GuildTextBasedChannel) {
        if (this.currentQuestion !== null) {
            let message = this.getMessageHeader(team)
            message.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`## ${this.currentQuestion!.question}\n-# By ${this.currentQuestion!.author}`)
            ])

            let answersSelect = new Discord.StringSelectMenuBuilder()
                .setCustomId(`teams-events-${this.commandName}-answer`)
                .setPlaceholder("Select an Answer")

            this.currentQuestion.shuffledAnswers.forEach((answer, index) => {
                answersSelect.addOptions(new Discord.StringSelectMenuOptionBuilder()
                    .setLabel(String(answer).substring(0, 80))
                    .setValue(String(index)))
                if (answer === this.currentQuestion!.correctAnswer) {
                    this.currentQuestion!.correctAnswerValue = String(index)
                }
            })

            message.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
                actionRow.setComponents(answersSelect)
            )
            await channel.send({
                components: [message],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        let embed = new Discord.EmbedBuilder()
        if (customId === "answer" && interaction.isStringSelectMenu() && this.currentQuestion) {

            this.log(this.currentQuestion.correctAnswer, interaction.values)
            if (this.currentQuestion.answeredUsers.includes(interaction.user.id)) {
                embed.setColor(Discord.Colors.Red)
                embed.setTitle("You have already answered this question!")
            } else if (interaction.values[0] === this.currentQuestion.correctAnswerValue) {
                this.currentQuestion.answeredUsers.push(interaction.user.id)
                this.log(`Correct answer from ${interaction.user.username}`)
                embed.setColor(Discord.Colors.Green)
                embed.setTitle("Thank you for your answer!")
            } else {
                this.currentQuestion.answeredUsers.push(interaction.user.id)
                this.log(`Incorrect answer from ${interaction.user.username}`)
                embed.setColor(Discord.Colors.Green)
                embed.setTitle("Thank you for your answer!")
            }
        } else {
            embed.setColor(Discord.Colors.Red)
            embed.setTitle("There are no trivia questions right now!")
            embed.setDescription("If this has appeared, the bot most likely crashed, please let an Event Manager know.")
        }
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
    }

    shuffle(array: Array<any>) {
        let currentIndex = array.length;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
    }
}