import TeamsModule from "../module";
import TeamClass from "../team";
// @ts-ignore
import * as Discord from "discord.js";
import TeamsEvent from "../event.js";
import * as module from "node:module";
// @ts-ignore
import {GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet} from "google-spreadsheet";
// @ts-ignore
import {JWT} from "google-auth-library";

type TeamsTriviaQuestion = {
    author: string,
    reward: number,
    question: string,
    correctAnswer: string,
    incorrectAnswers: string[],
    answerOrder?: string[],
    correctIndex?: number,
    hint: string,
    image: string
}

export default class TeamsEventTrivia extends TeamsEvent {
    name = "Trivia"
    description = "Asks each team a multiple choice question."
    instructions = "Read the question and all possible answers, pick whichever one you think is right and await the results."
    currentQuestion: TeamsTriviaQuestion | undefined
    responses: Discord.Collection<number, Discord.Collection<Discord.Snowflake, string>> = new Discord.Collection()
    acceptingResponses = false
    startDelay = 30 * 1000
    endDelay = 60 * 1000

    constructor(module: TeamsModule, context: {question?: TeamsTriviaQuestion}) {
        super(module, context)
        if (context.question) {
            this.setNewQuestion(context.question)
        } else {
            // this.setNewQuestion({
            //     author: "Ramiris",
            //     reward: 5,
            //     question: "What is the unlaiden air velocity of a swallow?",
            //     correctAnswer: "An African or European swallow?",
            //     incorrectAnswers: ["Your mother", "An American swallow?", "69km/h"],
            //     hint: "This is a supposed hint.",
            //     image: "https://cdn.discordapp.com/attachments/1395279350403960922/1395279387426947184/redwood.png?ex=69f19a31&is=69f048b1&hm=1779ed3bebe125d07672a2ccef188aeb7e2be9102de626fb9f01798444043f3a&"
            // })
        }
    }

    async prepareEvent() {
        await super.prepareEvent()
        setTimeout(async () => {
            await this.startEvent()

            setTimeout(async () => {
                await this.endEvent()
            }, this.endDelay)
        }, this.startDelay)
    }

    async startEvent() {
        await super.startEvent()
    }

    async endEvent() {
        await super.endEvent()
    }

    setNewQuestion(question: TeamsTriviaQuestion) {
        let list = [question.correctAnswer]
        for (let answer of question.incorrectAnswers) {list.push(answer)}
        this.shuffleArray(list)
        question.answerOrder = list
        question.correctIndex = list.findIndex((value) => {
            return value === question.correctAnswer
        })
        this.currentQuestion = question
    }

    async prepareGlobal() {
        await super.prepareGlobal()

        if (this.currentQuestion) {
            return
        }
        const googleJWT = new JWT({
            email: process.env.TEAMS_GOOGLE_EMAIL,
            key: process.env.TEAMS_GOOGLE_PRIVATEKEY!.split(String.raw`\n`).join('\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
        })
        let document = new GoogleSpreadsheet(process.env.TEAMS_GOOGLE_SHEET, googleJWT)
        await document.loadInfo()
        let sheet: GoogleSpreadsheetWorksheet = document.sheetsByIndex[0]
        await sheet.loadHeaderRow()
        const headers = sheet.headerValues

        let questionRows: GoogleSpreadsheetRow[] = await sheet.getRows()
        questionRows = questionRows.filter((value) => {return value.get(headers[2]) !== ""})
        const question = questionRows[Math.floor(Math.random() * (questionRows.length-1))]

        let incorrectAnswers: Array<string> = [question.get(headers[5])]
        for (let column of [6,7]) {
            let answer = question.get(headers[column])
            if (answer) {
                incorrectAnswers.push(answer)
            }
        }

        this.setNewQuestion({
            author: String(question.get(headers[0])),
            reward: Number(question.get(headers[1])),
            question: String(question.get(headers[2])),
            correctAnswer: String(question.get(headers[4])),
            incorrectAnswers: incorrectAnswers,
            hint: "",
            image: "" //String(question.get(headers[3]))
        })
    }

    async prepareTeam(team: TeamClass) {
        this.responses.set(team.id, new Discord.Collection())
        let embed = this.module.embeds.teamHeader(team, `Question ${Discord.time(new Date(new Date().getTime() + this.startDelay), Discord.TimestampStyles.RelativeTime)}`, `Prepare to answer one of the questions. You can work together or alone, points will be earned to help your team take the lead. Please, in the spirit of the game and fairness, do not use any external tools or aids to gain an unfair advantage. Good luck ${team.name}!`)
        await team.channel.send({components: [embed], flags: Discord.MessageFlags.IsComponentsV2})
    }

    async startGlobal() {
        this.acceptingResponses = true
    }

    async startTeam(team: TeamClass) {
        let text = `# ${this.currentQuestion!.question}`
        if (this.currentQuestion?.hint) text += `\nHint: ||${this.currentQuestion!.hint}||`
        text += `\n-# Answers close ${Discord.time(new Date(new Date().getTime() + this.endDelay), Discord.TimestampStyles.RelativeTime)}`

        let embed = this.module.embeds.teamHeader(team, this.name, this.instructions)
        embed.addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
            .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(text)
            )

        if (this.currentQuestion?.image) {
            embed.addMediaGalleryComponents((media: Discord.MediaGalleryBuilder) => media
                .addItems((item: Discord.MediaGalleryItemBuilder) => item
                    .setURL(this.currentQuestion!.image)
                )
            )
        }

        let achSelect = new Discord.StringSelectMenuBuilder()
            .setCustomId(`${this.module.commandName}-events-answer`)
            .setPlaceholder("Select an answer...")

        for (let index in this.currentQuestion?.answerOrder!) {
            achSelect.addOptions(
                new Discord.StringSelectMenuOptionBuilder()
                    .setLabel(this.currentQuestion?.answerOrder![index])
                    .setValue(String(index))
            )
        }
        embed.addActionRowComponents(
            new Discord.ActionRowBuilder()
                .addComponents(achSelect)
        )
        await team.channel.send({components: [embed], flags: Discord.MessageFlags.IsComponentsV2})
    }

    async endGlobal() {
        this.acceptingResponses = false
    }

    async endTeam(team: TeamClass) {
        let teamResponses = this.responses.get(team.id)
        let teamScore = 0
        for (let result of teamResponses.values()) {
            if (result === this.currentQuestion!.correctIndex) {
                teamScore++
            }
        }
        let teamPercentage = Math.round((teamScore / teamResponses!.size) * 100)
        teamScore = teamScore * (this.currentQuestion?.reward ? this.currentQuestion.reward : 1)
        let reward = Math.round((teamPercentage / 100) * (this.currentQuestion?.reward ? this.currentQuestion.reward : 1))
        let desc
        if (teamResponses!.size === 0) {
            desc = `Unfortunately nobody answered in time, better luck next time!`
        } else {
            desc = `As a team, you scored a total of ${reward} points, with ${teamPercentage}% of the team getting the answer correct.`
            let bodyData = {
                "token": process.env.API_TOKEN as string,
                "user_ids": teamResponses.keys().toArray(),
                "team_id": team.id,
                "score": reward,
                "reason": `[${team.id}] ${team.name} got ${teamPercentage}% of their answers right.`,
            }

            let res = await fetch(`${process.env.API_HOST}/api/teams_v2/score/add`, {
                method: "POST",
                body: JSON.stringify(bodyData),
                headers: {"Content-type": "application/json"}
            })
        }

        let embed = this.module.embeds.teamHeader(team, "Time is up!", desc)
        await team.channel.send({components: [embed], flags: Discord.MessageFlags.IsComponentsV2})
    }

    async onInteraction(interaction: Discord.StringSelectMenuInteraction, customId: string) {
        switch (customId) {
            case "answer":
                if (this.acceptingResponses) {
                    let team = this.module.getMemberTeam(interaction.member)
                    if (team) {
                        this.responses.get(team.id)!.set(interaction.user.id, Number(interaction.values[0]))
                        let embed = this.module.bot.embeds.success("Response Submitted", "Your answer has been submitted, please wait for the collective results to be posted.")
                        await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                    } else {
                        let embed = this.module.bot.embeds.failure("Response Not Submitted", "Please join a team before trying to respond.")
                        await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                    }
                } else {
                    let embed = this.module.bot.embeds.failure("Responses Closed", "The time to respond has expired or not opened yet.")
                    await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                }
                return
        }
    }

    shuffleArray(array: Array<any>) {
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