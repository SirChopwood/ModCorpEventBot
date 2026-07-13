// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsModule from "../module";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('trivia')
        .setDescription('[Admin] Send a Trivia question to the teams')
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('question')
            .setDescription('The question to ask.')
            .setRequired(true)
        )
        .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
            .setName('reward')
            .setDescription('The score reward for the question.')
            .setRequired(true)
        )
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('correct-answer')
            .setDescription('The Correct Answer.')
            .setRequired(true)
        )
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('incorrect-answer1')
            .setDescription('One of the incorrect answers.')
            .setRequired(true)
        )
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('incorrect-answer2')
            .setDescription('(Optional) One of the incorrect answers.')
            .setRequired(false)
        )
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('incorrect-answer3')
            .setDescription('(Optional) One of the incorrect answers.')
            .setRequired(false)
        )
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('hint')
            .setDescription('(Optional) A hint towards the answer.')
            .setRequired(false)
        ),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isAdmin(interaction.user)) {
            await interaction.reply({
                embeds: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        let teams: TeamsModule = bot.modules.get("teams")

        await interaction.reply({
            components: [bot.embeds.generic("Sending...", "", `Sending the question "${interaction.options.getString('question')}" and sending it to the teams!`)],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })


        try {
            let answers = [interaction.options.getString('incorrect-answer1') as string]
            if (interaction.options.getString('incorrect-answer2')) answers.push(interaction.options.getString('incorrect-answer2'))
            if (interaction.options.getString('incorrect-answer3')) answers.push(interaction.options.getString('incorrect-answer3'))

            let classConstructor = teams.events.get("trivia")
            teams.currentEvent = await new classConstructor(teams, {question: {
                author: interaction.member.displayName,
                reward: interaction.options.getInteger('reward'),
                question: interaction.options.getString('question'),
                correctAnswer: interaction.options.getString('correct-answer'),
                incorrectAnswers: answers,
                hint: interaction.options.getString('hint') || "",
                image: "",
            }})
            await teams.currentEvent!.initialise()
            await teams.currentEvent!.prepareEvent()
            await interaction.followUp({
                components: [bot.embeds.success("Success", `Trivia Event Started!`)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        } catch (e) {
            await interaction.followUp({
                components: [bot.embeds.failure("Error", `Failed to trigger Trivia Event!\n${e}`)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        }
    }
};