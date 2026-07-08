// @ts-ignore
import * as Discord from "discord.js";
import TeamClass from "./team.js";
import DiscordBot from "../../bot";

export default class Embeds {
    bot: DiscordBot

    constructor(bot: DiscordBot) {
        this.bot = bot
    }

    async teamInfo(team: TeamClass) {
        let text = ""
        if (team.guild) {
            text += `Guild: **${team.guild.name}**\n-# ${team.guild.id}`
        } else {
            text += `Guild: **Guild Not Found!**`
        }
        if (team.channel) {
            text += `\n\nChannel: **#${team.channel.name}**\n-# ${team.channel.id}`
        } else {
            text += `\n\nChannel: **Channel Not Found!**`
        }
        if (team.role) {
            text += `\n\nRole: **@${team.role.name}**\n-# ${team.role.id}`
            let roleCounts = await this.bot.getGuildMemberCounts(team.guild.id)
            text += `\nMember Count: ${Discord.inlineCode(roleCounts.get(team.role.id))}`
        } else {
            text += `\n\nRole: **Role Not Found!**`
        }
        text += `\n\nScore: ${Discord.inlineCode(team.score)}`

        let message = this.teamTitle(team, team.description)
        message.addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
            .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(text)
            )
        return message
    }

    teamHeader(team: TeamClass, title: string, description: string) {
        return this.bot.embeds.thumbnail(
            `[${team.id}] ${team.name}`,
            title,
            description,
            team.icon_url,
            Discord.resolveColor(team.colour)
        )
    }

    teamTitle(team: TeamClass, content: string) {
        return new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor(team.colour))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`## [${team.id}] ${team.name}\n${content}`)
                )
                .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                    .setURL(team.icon_url)
                )
            )
    }

    signupBoard() {
        return this.bot.embeds.thumbnail(
            "Signup Board",
            "We here at Modcorp would like to formally welcome you back to Camp Neko!",
            `We know it's been a couple years, but we've been hard at work getting everything ready for you!
Strange anamolies? Fuggedaboudit!
This year we "guarantee" that there is nothing spooky or out the ordinary.

-# (Insert random message here about modcorp not being viable for any happenings of the paranormal/supernatural)

Please press the nondescript button below for no specific reasoning and join your fellow campers at the site. Please do not read the small print.`,
            "https://louismayes.xyz/images/modcorp/teams/CampNeko.png",
            Discord.resolveColor("#a63232")
        ).addSectionComponents(
            new Discord.SectionBuilder()
                .setButtonAccessory(
                    new Discord.ButtonBuilder()
                        .setStyle(Discord.ButtonStyle.Primary)
                        .setLabel("Enter the Camp")
                        .setCustomId("teams-assignment")
                )
                .addTextDisplayComponents(
                    new Discord.TextDisplayBuilder().setContent("-# This will Semi-Randomly assign you to a team. \n-# Yes it balances over time, no we will not reassign teams later. \n-# No, this isn't a joke."),
                ),
        )
    }
}