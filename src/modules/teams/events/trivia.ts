// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
// @ts-ignore
import {GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet} from "google-spreadsheet";

export default class TriviaQuestion extends TeamsEvent {
    name = "Trivia"
    desc = "A simple multiple choice question."
    currentQuestion: {
        author: string,
        reward: string,
        image: string | null,
        question: string,
        correctAnswer: string,
        shuffledAnswers: Array<string>
    } | null = null
    
    constructor(bot: DiscordBot) {
        super(bot)
    }

    async prepareEvent() {
        const doc: GoogleSpreadsheet = this.bot.modules.get("teams").spreadsheet
        await doc.loadInfo()
        let sheet: GoogleSpreadsheetWorksheet = await doc.sheetsByIndex[0]
        await sheet.loadHeaderRow()
        let questionRows: GoogleSpreadsheetRow[] = await sheet.getRows({offset: Math.floor(Math.random() * sheet.rowCount), limit: 1})
        const headers = sheet.headerValues
        const question = questionRows[0]
        console.log(question.toObject())
        let shuffledAnswers: Array<string> = [question.get(headers[4])]
        for (let column of [5,6,7,8,9,10]) {
            let answer = question.get(headers[column])
            console.log(column, answer)
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
            shuffledAnswers: shuffledAnswers
        }
    }

    async triggerEvent(team: Team, guild: Discord.Guild, channel: Discord.GuildTextBasedChannel) {
        if (this.currentQuestion !== null) {
            let message = this.getMessageHeader(team)
            message.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`## ${this.currentQuestion!.question}\n-# By ${this.currentQuestion!.author}`)
            ])

            let answersSelect = new Discord.StringSelectMenuBuilder()
                .setCustomId("teams-events-trivia")
                .setPlaceholder("Select an Answer")

            this.currentQuestion.shuffledAnswers.forEach((answer, index) => {
                answersSelect.addOptions(new Discord.StringSelectMenuOptionBuilder()
                    .setLabel(String(answer).substring(0, 80))
                    .setValue(String(index)))
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

    async onInteraction(interaction: Discord.Interaction) {

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