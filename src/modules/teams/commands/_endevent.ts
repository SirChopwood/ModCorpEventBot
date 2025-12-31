// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";

export default {
    data: new Discord.SlashCommandBuilder()
        .setName('endevent')
        .setDescription('[Owner] sssshhhh!'),

    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isOwner(interaction.user)) {
            let embed = new Discord.EmbedBuilder()
                .setColor(Discord.Colors.Red)
                .setTitle("You do not have permission for this!")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral});
        }

        let eventModule = bot.modules.get("teams")
        await eventModule.triggerEvent(["snowballbossfight"])
        let embed = new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Green)
            .setTitle("It has been done...")
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral});
    }
};