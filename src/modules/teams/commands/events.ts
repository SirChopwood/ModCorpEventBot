// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsModule from "../module";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('events')
        .setDescription('[Admin] Toggle the Event Timer on/off')
        .addBooleanOption((option: Discord.SlashCommandBooleanOption) => option
            .setName('enabled')
            .setDescription('Should the timer should be running?')
            .setRequired(true)
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
        let enabled = interaction.options.getBoolean('enabled')

        await interaction.reply({
            components: [bot.embeds.generic("Processing...", "", `Setting the timer state to ${enabled}!`)],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })

        if (enabled) {
            if (!teams.eventTimer) {
                await teams.startEventTimer()
                await interaction.editReply({
                    components: [bot.embeds.success("Success", `Timer Started!`)],
                    flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
                })
            } else {
                await interaction.editReply({
                    components: [bot.embeds.failure("Error", "Timer already running!")],
                    flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
                })
            }
        } else {
            if (teams.eventTimer) {
                await teams.stopEventTimer()
                await interaction.editReply({
                    components: [bot.embeds.success("Success", `Timer Stopped!`)],
                    flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
                })
            } else {
                await interaction.editReply({
                    components: [bot.embeds.failure("Error", "Timer not running!")],
                    flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
                })
            }
        }







    }
};