// @ts-ignore
import {ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder} from "discord.js";
import DiscordBot from "../../../bot.js";

export default {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('[Owner] Reloads bot modules.'),
    async execute(bot: DiscordBot, interaction: ChatInputCommandInteraction) {
        if (bot.permissions.isOwner(interaction.user)) {
            let embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .setTitle("Reloading...")
                .setDescription("Please Wait")
            await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral})
            await bot.unmountModules()
            await bot.mountAllModules()
            embed.setColor(Colors.Green)
            embed.setTitle("Modules Reloaded")
            embed.setDescription(`${bot.modules.size} Modules Successfully Loaded.`)
            await interaction.editReply({embeds: [embed], flags: MessageFlags.Ephemeral})
        } else {
            let embed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("You do not have permission for this!")
            await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral});
        }
    }
};