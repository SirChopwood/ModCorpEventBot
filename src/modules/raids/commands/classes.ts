// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('classes')
        .setDescription('[Admin] Open Class Selection')
        .addUserOption((option: Discord.SlashCommandUserOption) => option
            .setName('target')
            .setDescription('User to modify the class of.')
            .setRequired(false)
        ),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isAdmin(interaction.user)) {
            await interaction.reply({
                components: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.reply({
            components: [bot.embeds.generic("Creating Class Selection...")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })

        await bot.modules.get("raids").createClassSelection(interaction.channel)

        await interaction.editReply({
            components: [bot.embeds.success("Class Selection Created!")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })
    }
};