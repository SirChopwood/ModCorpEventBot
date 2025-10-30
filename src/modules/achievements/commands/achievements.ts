// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your achievements!'),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        await interaction.reply({
            content: "Loading...",
            flags: [Discord.MessageFlags.Ephemeral]
        })

        let achievementsRes = await fetch("https://louismayes.xyz/api/v1/modcorp/achievements/user", {
            method: "POST",
            body: JSON.stringify({"user_id": interaction.user.id}),
            headers: {"Content-type": "application/json"}
        })
        if (!achievementsRes.ok) {await interaction.editReply("Failed to load Achievements.")}

        let data = await achievementsRes.json()

        let embed = new Discord.ContainerBuilder()
            .setAccentColor(Discord.Colors.Blurple)
            .addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`# :star: ${interaction.user.displayName}'s Achievements`)
            ])
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)

        if (data.awards.length === 0) {
            embed.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`There's nothing here... *for now*...`)
            ])
        } else {
            for (let award of data.awards) {
                let ach = data.achievements[award.achievement]
                let text = `## ${ach.name}\n*${ach.description}*\n${Discord.time(Date.parse(award.timestamp))}`
                if (award.note) {
                    text += `\n"${award.note}"`
                }

                embed.addSectionComponents((section: Discord.SectionBuilder) => section
                    .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                        .setURL(ach.file)
                    )
                    .addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(text)
                    ])
                )
            }
        }


        await interaction.channel.send({
            content: null,
            components: [embed],
            flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
        });
    }
};