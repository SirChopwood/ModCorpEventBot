// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
// @ts-ignore
import {GoogleSpreadsheetRow} from "google-spreadsheet";
import {DiscordBotModuleType} from "../../../module";

export default class Anagrams extends TeamsEvent {
    currentQuestion: {
        author: string,
        reward: string,
        originalWord: string,
        shuffledWord: string,
    } | null = null
    messageReferences: Record<string, Discord.ContainerComponentBuilder> = {}

    constructor(bot: DiscordBot, module: DiscordBotModuleType) {
        super(bot, module, {
            name: "Anagrams",
            desc: "Randomised orders of letters.",
            instructions: "Decrypt and organise the letters to spell out a word or phrase."
        })
    }

    async prepareEvent() {
        await super.prepareEvent()
        // Prepare Google Docky
        let {document, sheet, headers} = await this.module.getSpreadsheet(1)
        let questionRows: GoogleSpreadsheetRow[] = await sheet.getRows({offset: (Math.floor(Math.random() * (sheet.rowCount-2))+1), limit: 1})
        const question = questionRows[0]

        // Prepare Question and Answer
        const originalWord = question.get(headers[2]).toLowerCase() as string
        const shuffledWord = originalWord.toLowerCase().split("")
        this.shuffle(shuffledWord)

        // Setup for Triggers
        this.currentQuestion = {
            author: question.get(headers[0]),
            reward: question.get(headers[1]),
            originalWord: originalWord,
            shuffledWord: shuffledWord.join(" "),
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
                    .setContent(`## ${this.currentQuestion!.shuffledWord}\n-# By ${this.currentQuestion!.author}`)
            ])

            message.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
                actionRow.setComponents(
                    new Discord.ButtonBuilder()
                        .setLabel("Click to Answer!")
                        .setStyle(Discord.ButtonStyle.Primary)
                        .setCustomId(`${this.module.commandName}-events-${this.commandName}-open`)
                )
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
            this.teamRefs[team.id].messages["Main"] = sentMessage
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        let embed = new Discord.EmbedBuilder()
        for (const team of Object.values(this.teams)) {
            if (interaction.member.roles.cache.has(team.discord.role)) {
                if (customId === "open" && interaction.isButton()) {
                    if (this.scores.teams[team.id].AnswerUsers.includes(interaction.user.id)) {

                        // DUPLICATE ANSWER
                        embed.setColor(Discord.Colors.Red)
                        embed.setTitle("You have already answered this question!")
                        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
                        break

                    } else {

                        const modal = new Discord.ModalBuilder()
                            .setCustomId(`${this.module.commandName}-events-${this.commandName}-modal`)
                            .setTitle("Anagrams")

                        modal.addComponents(new Discord.ActionRowBuilder()
                            .addComponents(new Discord.TextInputBuilder()
                                .setLabel("Answer")
                                .setCustomId(`answer-text`)
                                .setPlaceholder("Write your answer here...")
                                .setStyle(Discord.TextInputStyle.Short)
                                .setRequired(true)
                            )
                        )

                        await interaction.showModal(modal)
                        break
                    }
                } else if (customId === "modal" && interaction.isModalSubmit()) {
                    if (interaction.fields.getTextInputValue("answer-text") === this.currentQuestion!.originalWord) {

                        // CORRECT ANSWER
                        this.scores.teams[team.id].AnswerUsers.push(interaction.user.id)
                        this.scores.teams[team.id].CorrectUsers.push(interaction.user.id)
                        this.scores.globalAnswerCount += 1
                        this.scores.globalCorrectCount += 1

                        this.log(`Correct answer from ${interaction.user.username}`)
                        embed.setColor(Discord.Colors.Green)
                        embed.setTitle("Thank you for your answer!")
                        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
                        break

                    } else {

                        // INCORRECT ANSWER
                        this.scores.teams[team.id].AnswerUsers.push(interaction.user.id)
                        this.scores.globalAnswerCount += 1

                        this.log(`Incorrect answer from ${interaction.user.username}`)
                        embed.setColor(Discord.Colors.Green)
                        embed.setTitle("Thank you for your answer!")
                        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
                        break

                    }
                } else {
                    embed.setColor(Discord.Colors.Red)
                    embed.setTitle("There are no anagrams right now!")
                    embed.setDescription("If this has appeared, the bot most likely crashed, please let an Event Manager know.")
                    await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
                    break
                }
            }
        }
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
            this.messageReferences[team.id].components[3].components[0].setLabel(text) // Editing String Select

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
            this.messageReferences[team.id].components[3].components[0].setLabel("Time's up!")
            this.messageReferences[team.id].components[3].components[0].setDisabled(true) // Disable button

            await this.teamRefs[team.id].messages["Main"].edit({
                components: [this.messageReferences[team.id]]
            })
        }
        this.currentQuestion = null
        this.messageReferences = {}
        this.log("Event Concluded")
    }
}