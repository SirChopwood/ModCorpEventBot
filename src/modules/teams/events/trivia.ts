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
        shuffledAnswers: Array<string>
    } | null = null
    messageReferences: Record<Discord.Snowflake, {
        team: Team,
        messageComponent: Discord.ContainerComponentBuilder,
        answeredUsers: Array<Discord.Snowflake>,
        correctAnsweredUsers: Array<Discord.Snowflake>
    }> = {}
    globalAnswerCount: number = 0
    globalCorrectAnswerCount: number = 0

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
            shuffledAnswers: shuffledAnswers
        }
        this.log(`Executing Trivia Event`)
        this.messageReferences = {}
        this.globalAnswerCount = 0
        this.globalCorrectAnswerCount = 0
        const eventDuration = Number(process.env.TEAMS_EVENT_DURATION) | 60000
        setTimeout(this.updateSelectText.bind(this), eventDuration - 30000, "30s remaining!")
        setTimeout(this.updateSelectText.bind(this), eventDuration - 10000, "10s remaining!")
        setTimeout(this.finishEvent.bind(this), eventDuration)
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
            let sentMessage = await channel.send({
                components: [message],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
            this.messageReferences[sentMessage.id] = {
                team: team,
                messageComponent: message,
                answeredUsers: [],
                correctAnsweredUsers: []
            }
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        let embed = new Discord.EmbedBuilder()
        if (customId === "answer"
            && interaction.isStringSelectMenu()
            && this.currentQuestion
            && Object.keys(this.messageReferences).length > 0
        ) {
            if (this.messageReferences[interaction.message.id].answeredUsers.includes(interaction.user.id)) {
                embed.setColor(Discord.Colors.Red)
                embed.setTitle("You have already answered this question!")
            } else if (interaction.values[0] === this.currentQuestion.correctAnswerValue) {
                this.messageReferences[interaction.message.id].answeredUsers.push(interaction.user.id)
                this.messageReferences[interaction.message.id].correctAnsweredUsers.push(interaction.user.id)
                this.globalAnswerCount += 1
                this.globalCorrectAnswerCount += 1

                this.log(`Correct answer from ${interaction.user.username}`)
                embed.setColor(Discord.Colors.Green)
                embed.setTitle("Thank you for your answer!")
            } else {
                this.messageReferences[interaction.message.id].answeredUsers.push(interaction.user.id)
                this.globalAnswerCount += 1

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

    async updateSelectText(text: string) {
        for (const messageId of Object.keys(this.messageReferences)) {
            const {team, messageComponent} = this.messageReferences[messageId]
            const teamGuild = await this.bot.client.guilds.fetch(team.discord.server)
            const teamChannel = await teamGuild.channels.fetch(team.discord.channel)
            let message = await teamChannel.messages.fetch(messageId)

            messageComponent.components[3].components[0].setPlaceholder(text) // Editing String Select
            await message.edit({
                components: [messageComponent],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }
    }

    async finishEvent() {
        for (const messageId of Object.keys(this.messageReferences)) {
            const {team, messageComponent, answeredUsers, correctAnsweredUsers} = this.messageReferences[messageId]
            const teamGuild = await this.bot.client.guilds.fetch(team.discord.server)
            const teamChannel = await teamGuild.channels.fetch(team.discord.channel)
            const message = await teamChannel.messages.fetch(messageId)

            const teamPoints = correctAnsweredUsers.length * Number(this.currentQuestion!.correctAnswerValue)
            // ADD POST REQUEST TO ADD POINTS HERE.

            messageComponent.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`Out of all ${this.globalAnswerCount} participants, ${this.globalCorrectAnswerCount} got the question right.\n**+${teamPoints} points to Team ${team.name}.**`)
            ])
            messageComponent.components[3].components[0].setPlaceholder("Time's up!") // Editing String Select
            messageComponent.components[3].components[0].setDisabled(true)
            await message.edit({
                components: [messageComponent],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }
        this.currentQuestion = null
        this.messageReferences = {}
        this.log("Event Concluded")
    }
}