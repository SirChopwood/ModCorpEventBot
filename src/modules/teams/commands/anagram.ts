// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsModule from "../module";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('anagram')
        .setDescription('[Admin] Send an Anagram question to the teams')
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('phrase')
            .setDescription('The original Phrase to scramble.')
            .setRequired(true)
        )
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('hint')
            .setDescription('(Optional) A hint towards the answer.')
            .setRequired(false)
        )
        .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
            .setName('reward')
            .setDescription('(Optional) The score reward for the question.')
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
            components: [bot.embeds.generic("Sending...", `Scrambling "${interaction.options.getString('phrase')}" and sending it to the teams!`)],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })


        try {
            let classConstructor = teams.events.get("anagrams")
            teams.currentEvent = await new classConstructor(teams, {
                author: interaction.member.displayName,
                reward: interaction.options.getInteger('reward') || 5,
                originalPhrase: interaction.options.getString('phrase'),
                hint: interaction.options.getString('hint') || "",
                image: ""
            })
            await teams.currentEvent!.initialise()
            await teams.currentEvent!.prepareEvent()
            await interaction.followUp({
                components: [bot.embeds.success("Success", `Anagram Event Started!`)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        } catch {
            await interaction.followUp({
                components: [bot.embeds.failure("Error", "Failed to trigger Anagram Event!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        }
    }
};