// @ts-ignore
import {ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder, MessageFlags} from "discord.js";
import DiscordBot from "../../../bot.js";

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(bot: DiscordBot, interaction: ChatInputCommandInteraction) {
        let time1: number = new Date().getTime();
        let embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Getting the latency...")
        interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral}).then(()=>{
            let time2: number = new Date().getTime();
            embed.setTitle("PONG!")
            embed.setDescription("The bot's ping is `" + (time2 - time1) + "` ms!")
            embed.setColor(Colors.Green)
            interaction.editReply({embeds: [embed], flags: MessageFlags.Ephemeral});
        })
    }
};