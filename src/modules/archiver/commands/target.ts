// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import ArchiverModule from "../module.js";

export default {
    data: new Discord.SlashCommandBuilder()
        .setName('target')
        .setDescription("[Admin] Target the channel for future Archival.")
        .addChannelOption(new Discord.SlashCommandChannelOption()
            .setRequired(true)
            .setName("channel")
            .setDescription("The Forum Channel of your choice.")),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isAdmin(interaction.user)) {
            await interaction.reply({content: "You do not have permission for this!", flags: Discord.MessageFlags.Ephemeral});
        }
        let module = await bot.requireModule("archiver", ArchiverModule)

        let newTargetChannel: Discord.ForumChannel | undefined = interaction.options.getChannel("channel")
        if (!newTargetChannel || newTargetChannel.type !== 15) {
            await interaction.reply({content: "This can only be used on a Forum channel of a guild!", flags: [Discord.MessageFlags.Ephemeral]})
            return
        }

        let targetWebhooks = await newTargetChannel.fetchWebhooks()
        if (targetWebhooks.size === 0) {
            await newTargetChannel.createWebhook({
                name: `${interaction.client.user.username} Archiver`,
                avatar: interaction.client.user.avatarURL(),
            })
        }
        let targetWebhook = (await newTargetChannel.fetchWebhooks()).first()

        module.targetChannels.set(interaction.user.id, {guild: interaction.guild.id, channel: newTargetChannel.id})
        await interaction.reply({content: `# Archiver Target Set \nNew Target: *#${newTargetChannel.name}* **(${interaction.guild.name})** \nAs Webhook: ${targetWebhook?.name}`, flags: [Discord.MessageFlags.Ephemeral]})
        return
    }
}