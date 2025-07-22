// @ts-ignore
import {ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder} from "discord.js";
import DiscordBot from "../../../bot.js";

export default {
    data: new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('[Owner] Closes the bot'),
    async execute(bot: DiscordBot, interaction: ChatInputCommandInteraction) {
        if (bot.permissions.isOwner(interaction.user)) {
            let embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .setTitle("Shutting Down")
                .setDescription("Goodbye")
            await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral})
            await bot.shutdown()
        } else {
            let embed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("You do not have permission for this!")
            await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral});
        }
    }
};