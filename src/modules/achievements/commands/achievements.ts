// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your achievements!')
        .addUserOption((option: Discord.SlashCommandUserOption) => option
            .setRequired(false)
            .setName("user")
            .setDescription("the user to search for")
        ),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        await interaction.deferReply({flags: [Discord.MessageFlags.Ephemeral]})

        let embed: Discord.ContainerBuilder | undefined = undefined
        let targetUser = await interaction.options.getUser("user")
        if (targetUser) {
            let targetMember = await interaction.guild.members.fetch(targetUser.id)
            if (targetMember) {
                embed = await bot.modules.get("achievements").createAchievementsEmbed(targetMember)
            } else {
                embed = await bot.modules.get("achievements").createAchievementsEmbed(interaction.member)
            }
        } else {
            embed = await bot.modules.get("achievements").createAchievementsEmbed(interaction.member)
        }

        if (!embed) {
            await interaction.followUp("Failed to create embed")
        }

        embed.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
            actionRow.setComponents(
                new Discord.ButtonBuilder()
                    .setLabel("Click to post to channel.")
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setCustomId(`achievements-repost-channel`)
            )
        )
        if (targetUser) {
            embed?.addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(targetUser.id))
        }
        await interaction.followUp({
            content: null,
            components: [embed],
            flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
        });
    }
};