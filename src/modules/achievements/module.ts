import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";

export default class AchievementsModule extends DiscordBotModule {


    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Achievements",
            desc: "The ability to give out awards and achievements to users.",
            colour: "magentaBright"
        });
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        const interactionCustomIds = customId.split("-")
        switch (interactionCustomIds[0]) {
            case "award":
                if (interactionCustomIds[1] === "modal") {
                    if (await this.awardAchievement(
                        interaction,
                        interaction.fields.getSelectedUsers("achievements-award-targetuser", true).first(),
                        interaction.fields.getStringSelectValues("achievements-award-targetid", true)[0],
                        interaction.fields.getTextInputValue("achievements-award-reason"),
                        interaction.fields.getTextInputValue("achievements-award-tier")
                    )) {
                        await interaction.reply({content: `Achievement Awarded`, flags: Discord.MessageFlags.Ephemeral})
                    } else {
                        await interaction.reply({content: `Failed to Award Achievement`, flags: Discord.MessageFlags.Ephemeral})
                    }
                }
                break
            case "repost":
                switch (interactionCustomIds[1]) {
                    case "channel": // USER POSTS PAGE TO CHANNEL
                        await interaction.deferReply()

                        let message = ""
                        try {
                            message = interaction.message.components[0].components.at(-1).content
                        } catch (e) {
                        }

                        let channelEmbed
                        if (message) {
                            let member = await interaction.guild.members.fetch(message)
                            channelEmbed = await this.createAchievementsEmbed(member)
                        } else {
                            channelEmbed = await this.createAchievementsEmbed(interaction.member)
                        }


                        channelEmbed.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
                            actionRow.setComponents(
                                new Discord.ButtonBuilder()
                                    .setLabel("Click to view your own achievements.")
                                    .setStyle(Discord.ButtonStyle.Secondary)
                                    .setCustomId(`achievements-repost-self`)
                            )
                        )
                        await interaction.followUp({
                            content: null,
                            components: [channelEmbed],
                            flags: [Discord.MessageFlags.IsComponentsV2]
                        })
                        break
                    case "self": // USER VIEWS OWN PAGE
                        await interaction.deferReply({flags: [Discord.MessageFlags.Ephemeral]})

                        let selfEmbed = await this.createAchievementsEmbed(interaction.member)
                        selfEmbed.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
                            actionRow.setComponents(
                                new Discord.ButtonBuilder()
                                    .setLabel("Click to post to channel.")
                                    .setStyle(Discord.ButtonStyle.Secondary)
                                    .setCustomId(`achievements-repost-channel`)
                            )
                        )
                        await interaction.followUp({
                            content: null,
                            components: [selfEmbed],
                            flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                        });
                        break
                }
                break
        }
    }

    async awardAchievement(interaction: Discord.Interaction, targetUser: Discord.User, achievementId: number, reason: string, tier: string = "0" ) {
        let res = await fetch(`${process.env.API_HOST}/api/v1/modcorp/achievements/award`, {
            method: "POST",
            body: JSON.stringify({
                "token": process.env.API_TOKEN,
                "user_name": interaction.user.displayName,
                "user_id": interaction.user.id,
                "target": [targetUser.id],
                "achievement": Number(achievementId),
                "note": reason,
                "tier": Number(tier)
            }),
            headers: {"Content-type": "application/json"}
        })
        return res.ok
    }

    async initialise(): Promise<void> {
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async createAchievementsEmbed(member: Discord.GuildMember): Promise<Discord.ContainerBuilder | undefined> {
        let achievementsRes = await fetch(`${process.env.API_HOST}/api/v1/modcorp/achievements/user`, {
            method: "POST",
            body: JSON.stringify({"user_id": member.id}),
            headers: {"Content-type": "application/json"}
        })
        if (!achievementsRes.ok) {return}

        let data = await achievementsRes.json()

        let embed = new Discord.ContainerBuilder()
            .setAccentColor(member.displayColor || Discord.Colors.Blurple)
            .addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`# :star: ${member.displayName}'s Achievements\n-# Type \`\`/Achievements\`\` to view your own!`)
            ])
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)


        embed.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                .setContent(`## Most Recent Achievements`)
        ])
        let participations: Array<{name: string, desc: string, file: string}> = []
        let achCount = 0
        const maxAchs = 3
        for (let i = data.awards.length -1; i >= 0; i--) {
            const award = data.awards[i]
            const ach = data.achievements[award.achievement]
            let tierName = ach.name
            let tierDesc = ach.description
            let tierFile = ach.file

            switch (ach.type) {
                case "Medal":
                    if (achCount > maxAchs) {continue}
                    achCount += 1

                    if (ach.tiers) {
                        tierName = ach.tiers[award.tier].name
                        tierDesc = ach.tiers[award.tier].description
                        tierFile = ach.tiers[award.tier].file
                    }

                    let time = Math.floor(new Date(award.timestamp).getTime()/1000)
                    let text = `### ${tierName}\n${tierDesc}\n<t:${time}:D><t:${time}:R>`
                    if (award.note) {
                        text += `\n*"${award.note}"*`
                    }
                    if (ach.tiers) {
                        text += "\n" + Discord.inlineCode(`Tier ${award.tier + 1} of ${ach.tiers.length}`)
                    }

                    embed.addSectionComponents((section: Discord.SectionBuilder) => section
                        .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                            .setURL(tierFile)
                        )
                        .addTextDisplayComponents([
                            (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                                .setContent(text)
                        ])
                    )
                    break
                case "Ribbon":
                    if (achCount > maxAchs) {continue}
                    achCount += 1

                    embed.addMediaGalleryComponents([
                        (mediaGallery: Discord.MediaGalleryBuilder) => mediaGallery.addItems([
                            (mediaItem: Discord.MediaGalleryItemBuilder) => mediaItem
                                .setDescription(`${tierName} - ${tierDesc}`)
                                .setURL(tierFile)
                        ])
                    ])

                    break
                case "Participation":
                    participations.push({
                        name: tierName,
                        desc: tierDesc,
                        file: tierFile,
                    })
                    break
            }
        }
        if (achCount === 0) {
            embed.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`There's nothing here... *for now*...`)
            ])
        }

        let PartText = "## Participation Awards"
        if (participations.length > 0) {
            for (let part of participations) {
                PartText += `\n- **${part.name}** - ${part.desc}`
            }
        } else {
            PartText += `\nParticipate in future events to earn these...`
        }
        embed.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                .setContent(PartText)
        ])
        return embed
    }
}