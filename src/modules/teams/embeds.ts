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
        let message = new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor(team.colour))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                        .setContent(`# ${team.name}\n-# ID: ${team.id}`),
                    (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                        .setContent(team.description)
                ])
                .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                    .setURL(team.logo_url)
                )
            )
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
        if (team.guild) {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                    Guild: **${team.guild.name}**\n-# ${team.guild.id}
                    `)])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                    Guild: **Guild Not Found!**
                    `)])
        }
        if (team.channel) {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                    Channel: **#${team.channel.name}**\n-# ${team.channel.id}
                    `)])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                    Channel: **Channel Not Found!**
                    `)])
        }
        if (team.role) {
            message.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`
                        Role: **@${team.role.name}**\n-# ${team.role.id}
                        `)
            ])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                    Role: **Role Not Found!**
                    `)])
        }
        if (team.guild && team.role) {
            let roleCounts = await this.bot.getGuildMemberCounts(team.guild.id)
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                    Member Count: ${Discord.inlineCode(roleCounts.get(team.role.id))}
                    `)])
        }
        return message
    }

    teamHeader(team: TeamClass, title: string, description: string) {
        return this.bot.embeds.thumbnail(
            team.name,
            title,
            description,
            team.icon_url,
            Discord.resolveColor(team.colour)
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