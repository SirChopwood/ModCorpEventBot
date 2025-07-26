// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
// @ts-ignore
import {GoogleSpreadsheetRow} from "google-spreadsheet";
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
    messageReferences: Record<string, Discord.ContainerComponentBuilder> = {}

    constructor(bot: DiscordBot, module: DiscordBotModuleType) {
        super(bot, module, {
            name: "Trivia",
            desc: "A simple multiple choice question.",
            instructions: "Read and discuss the question, then select your answer from the dropdown below. You may each answer individually."
        })
    }

    async prepareEvent() {
        await super.prepareEvent()
        // Prepare Google Docky
        let {document, sheet, headers} = this.module.getSpreadsheet(1)
        let questionRows: GoogleSpreadsheetRow[] = await sheet.getRows({offset: (Math.floor(Math.random() * (sheet.rowCount-1))+1), limit: 1})
        const question = questionRows[0]

        // Prepare Question and Answer
        let shuffledAnswers: Array<string> = [question.get(headers[4])]
        for (let column of [5,6,7,8,9,10]) {
            let answer = question.get(headers[column])
            if (answer) {
                shuffledAnswers.push(answer)
            }
        }
        this.shuffle(shuffledAnswers)

        // Setup for Triggers
        this.currentQuestion = {
            author: question.get(headers[0]),
            reward: question.get(headers[1]),
            image: question.get(headers[2]),
            question: question.get(headers[3]),
            correctAnswer: question.get(headers[4]),
            correctAnswerValue: "",
            shuffledAnswers: shuffledAnswers
        }
        this.messageReferences = {}
        this.resetScores()
    }

    async triggerEvent(team: Team) {
        await super.triggerEvent(team)
        if (this.currentQuestion !== null) {
            // Build Base Message
            let message = this.getMessageHeader(team)
            message.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`## ${this.currentQuestion!.question}\n-# By ${this.currentQuestion!.author}`)
            ])
            if (this.currentQuestion.image) {
                message.addMediaGalleryComponents((mediaGallery: Discord.MediaGalleryBuilder) => mediaGallery.addItems(
                    (mediaGalleryItem: Discord.MediaGalleryItemBuilder) => mediaGalleryItem
                        .setDescription(this.currentQuestion!.question)
                        .setURL(this.currentQuestion!.image)
                ))
            }
            let answersSelect = new Discord.StringSelectMenuBuilder()
                .setCustomId(`${this.module.commandName}-events-${this.commandName}-answer`)
                .setPlaceholder("Select an Answer")

            // Add answers and note which index is correct
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

            // Send Message
            let sentMessage = await this.teamRefs[team.id].channel.send({
                components: [message],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })

            // Store refs
            this.messageReferences[team.id] = message
            this.scores.teams[team.id] = {
                AnswerUsers: [],
                CorrectUsers: []
            }
            this.teamRefs[team.id].messages["Main"] = sentMessage.id
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        let embed = new Discord.EmbedBuilder()
        if (customId === "answer"
            && interaction.isStringSelectMenu()
            && this.currentQuestion
            && Object.keys(this.messageReferences).length > 0
        ) {
            for (const team of Object.values(this.teams)) {
                if (interaction.member.roles.cache.includes(team.discord.role)) {
                    const result = interaction.values[0] === this.currentQuestion.correctAnswerValue
                    await this.submitResult(interaction, team.id, result ? Number(this.currentQuestion.reward) : 0)
                    break
                }
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

    async updateEvent(text: string) {
        for (const team of Object.values(this.teams)) {
            this.messageReferences[team.id].components[3].components[0].setPlaceholder(text) // Editing String Select

            await this.teamRefs[team.id].messages["Main"].edit({
                components: [this.messageReferences[team.id]]
            })
        }
    }

    async finishEvent() {
        for (const team of Object.values(this.teams)) {
            const teamPoints = this.scores.teams[team.id].CorrectUsers.length * Number(this.currentQuestion!.reward)
            // ADD POST REQUEST TO ADD POINTS HERE.

            this.messageReferences[team.id].addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`Out of all ${this.scores.globalAnswerCount} participants, ${this.scores.globalCorrectCount} got the question right.\n**+${teamPoints} points to Team ${team.name}.**`)
            ])
            this.messageReferences[team.id].components[3].components[0].setPlaceholder("Time's up!") // Editing String Select
            this.messageReferences[team.id].components[3].components[0].setDisabled(true)

            await this.teamRefs[team.id].messages["Main"].edit({
                components: [this.messageReferences[team.id]]
            })
        }
        this.currentQuestion = null
        this.messageReferences = {}
        this.log("Event Concluded")
    }
}