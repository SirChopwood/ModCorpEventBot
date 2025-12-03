// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";

export default {
    data: new Discord.SlashCommandBuilder()
        .setName('trigger')
        .setDescription('[Admin] Triggers a Team Event!')
        .addStringOption((option: Discord.SlashCommandStringOption) =>
            option.setName('event')
                .setDescription('The event to trigger')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isAdmin(interaction.user)) {
            let embed = new Discord.EmbedBuilder()
                .setColor(Discord.Colors.Red)
                .setTitle("You do not have permission for this!")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral});
        }

        let input = interaction.options.getString('event')
        let eventModule = bot.modules.get("teams")
        let eventList = eventModule.events.keys().toArray()

        if (!eventList.includes(input) && input !== "random") {
            let embed = new Discord.EmbedBuilder()
                .setColor(Discord.Colors.Red)
                .setTitle("Event not found!")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral});
        }

        let embed = new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setTitle("Executing...")
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral});

        if (input === "random") {
            await eventModule.triggerEvent()
        } else {
            await eventModule.triggerEvent([input])
        }
    },

    async autocomplete(bot: DiscordBot, interaction: Discord.AutocompleteInteraction) {
        let input = interaction.options.getFocused()
        let eventList = bot.modules.get("teams").events.keys()
        let options: Array<{ name: string, value: string}> = [
            { name: "random", value: "random"}
        ]

        for (const event of eventList) {
            if (event.startsWith(input)) {
                options.push({ name: event, value: event})
            }
        }
        await interaction.respond(options)
    }
};