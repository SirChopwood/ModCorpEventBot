import TeamsModule from "../module";
import TeamClass from "../team";
// @ts-ignore
import * as Discord from "discord.js";
import TeamsEvent from "../event.js";
import * as module from "node:module";

type TeamsAnagramQuestion = {
    author: string,
    reward: number,
    originalPhrase: string,
    shuffledPhrase?: string,
    hint: string,
    image: string
}

export default class TeamsEventAnagrams extends TeamsEvent {
    name = "Anagrams"
    description = "Asks each team a question involving a word that's had its letters shuffled."
    instructions = "Decode the original phrase from the scrambled one provided. Answer by using the button below and typing the correct phrase. (Case-Insensitive, Spaces are represented by Underscores '_')"
    currentQuestion: TeamsAnagramQuestion | undefined
    responses: Discord.Collection<number, Discord.Collection<Discord.Snowflake, string>> = new Discord.Collection()
    acceptingResponses = false

    constructor(module: TeamsModule, context: {question?: TeamsAnagramQuestion}) {
        super(module, context)
        if (context.question) {
            this.setNewQuestion(context.question)
        } else {
            this.setNewQuestion({
                author: "Ramiris",
                reward: 5,
                originalPhrase: "Hello There Val",
                hint: "This is a supposed hint.",
                image: "https://cdn.discordapp.com/attachments/1395279350403960922/1395279387426947184/redwood.png?ex=69f19a31&is=69f048b1&hm=1779ed3bebe125d07672a2ccef188aeb7e2be9102de626fb9f01798444043f3a&"
            })
        }
    }

    async prepareEvent() {
        await super.prepareEvent()
        setTimeout(async () => {
            await this.startEvent()
        }, 30*1000)
        setTimeout(async () => {
            await this.endEvent()
        }, 60*1000)
    }

    async startEvent() {
        await super.startEvent()
    }

    async endEvent() {
        await super.endEvent()
    }

    setNewQuestion(question: TeamsAnagramQuestion) {
        function shuffle(array: Array<any>) {
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

        let phraseWords = question.originalPhrase.toLowerCase().split(" ")
        let shuffledPhrase = ""

        // For each word
        phraseWords.forEach((word, wordIndex) => {
            let letters = word.split("")
            // Shuffle letters within
            shuffle(letters)
            // Stitch back together
            letters.forEach((letter, letterIndex) => {
                shuffledPhrase += letter
            })
            if (wordIndex < phraseWords.length-1) {
                shuffledPhrase += "_"
            }
        })
        question.shuffledPhrase = shuffledPhrase
        this.currentQuestion = question
    }

    async prepareGlobal() {
        await super.prepareGlobal()
    }

    async prepareTeam(team: TeamClass) {
        this.responses.set(team.id, new Discord.Collection())
        let embed = this.module.embeds.teamHeader(team, "Question in 30s", `Prepare to answer one of the questions. You can work together or alone, points will be earned to help your team take the lead. Please, in the spirit of the game and fairness, do not use any external tools or aids to gain an unfair advantage. Good luck ${team.name}!`)
        await team.channel.send({components: [embed], flags: Discord.MessageFlags.IsComponentsV2})
    }

    async startGlobal() {
        this.acceptingResponses = true
    }

    async startTeam(team: TeamClass) {
        let text = `# ${Discord.inlineCode(this.currentQuestion!.shuffledPhrase)}`
        if (this.currentQuestion?.hint) text += `\nHint: ||${this.currentQuestion!.hint}||`

        let embed = this.module.embeds.teamHeader(team, this.name, this.instructions)
        embed.addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
        embed.addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(text)
                )
                .setButtonAccessory((button: Discord.ButtonBuilder) => button
                    .setLabel("Click to Answer!")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-openmodal`)
                )
        )
        if (this.currentQuestion?.image) {
            embed.addMediaGalleryComponents((media: Discord.MediaGalleryBuilder) => media
                .addItems((item: Discord.MediaGalleryItemBuilder) => item
                    .setURL(this.currentQuestion!.image)
                )
            )
        }
        await team.channel.send({components: [embed], flags: Discord.MessageFlags.IsComponentsV2})
    }

    async endGlobal() {
        this.acceptingResponses = false
    }

    async endTeam(team: TeamClass) {
        let teamResponses = this.responses.get(team.id)
        let teamScore = 0
        for (let result of teamResponses.values()) {
            if (result === this.currentQuestion!.originalPhrase.toLowerCase()) {
                teamScore++
            }
        }
        let teamPercentage = (teamScore / teamResponses!.size) * 100
        teamScore = teamScore * (this.currentQuestion?.reward ? this.currentQuestion.reward : 1)
        let desc
        if (teamResponses!.size === 0) {
            desc = `Unfortunately nobody answered in time, better luck next time!`
        } else {
            desc = `As a team, you scored a total of ${teamScore} points, with ${teamPercentage}% of the team getting the answer correct.`
        }

        let embed = this.module.embeds.teamHeader(team, "Time is up!", desc)
        await team.channel.send({components: [embed], flags: Discord.MessageFlags.IsComponentsV2})
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        switch (customId) {
            case "openmodal":
                if (this.acceptingResponses) {
                    const modal = new Discord.ModalBuilder()
                        .setCustomId(`${this.module.commandName}-events-closemodal`)
                        .setTitle("Anagrams")
                    modal.addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                        .setContent(`${this.instructions}\n# ${Discord.inlineCode(this.currentQuestion!.shuffledPhrase)}`)
                    )
                    modal.addLabelComponents((label: Discord.LabelBuilder) => label
                        .setLabel("Answer")
                        .setTextInputComponent((input: Discord.TextInputBuilder) => input
                            .setCustomId("answer-text")
                            .setStyle(Discord.TextInputStyle.Short)
                            .setPlaceholder("Write your answer here...")
                            .setRequired(true)
                        )
                    )
                    await interaction.showModal(modal)
                } else {
                    let embed = this.module.bot.embeds.failure("Responses Closed", "The time to respond has expired or not opened yet.")
                    await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                }
                return
            case "closemodal":
                if (this.acceptingResponses) {
                    let team = this.module.getMemberTeam(interaction.member)
                    if (team) {
                        this.responses.get(team.id)!.set(interaction.user.id, interaction.fields.getTextInputValue("answer-text").toLowerCase())
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
}