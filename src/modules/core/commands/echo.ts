// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('echo')
        .setDescription('[Admin] Echo echo echo...')
        .addStringOption((option: Discord.SlashCommandStringOption) => option
            .setName('text')
            .setDescription('Text to echo...')
            .setRequired(true)
        ),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isAdmin(interaction.member)) {
            await interaction.reply({
                components: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.reply({
            components: [bot.embeds.success("Echoing...")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })
        await interaction.channel.send(interaction.options.getString('text'))
    }
};