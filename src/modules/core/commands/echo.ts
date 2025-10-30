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
        await interaction.reply({
            content: "Echoing...",
            flags: [Discord.MessageFlags.Ephemeral]
        })
        await interaction.channel.send(interaction.options.getString('text'))
    }
};