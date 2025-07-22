// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../bot";
import DiscordBotModule from "../../module.js";

type Team = {
    "id": number,
        "name": string,
        "description": string,
        "colour": string,
        "logo_url": string,
        "discord": {
        "role": string,
            "channel": string,
            "server": string,
    }
}

export default class CoreModule extends DiscordBotModule {
    override name = "Teams"
    override desc = "The framework for the discord teams."
    currentTeams: Discord.Collection<string, Team> = new Discord.Collection()

    constructor(bot: DiscordBot, path: string) {
        super(bot, path);

        bot.client.on(Discord.Events.InteractionCreate, async (interaction: Discord.Interaction) => {
            if (interaction.isButton() && interaction.customId.startsWith("team")) {
                if (interaction.customId.endsWith("assignment")) {
                    await this.assignRandomTeam(interaction)
                }
            }
        })
    }

    async initialise(): Promise<void> {
        await super.initialise();

        await this.updateCurrentTeams()
        setInterval(this.updateCurrentTeams.bind, 1000*60*60, this)
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async getTeamRatios() {
        let memberCount: Record<string, number> = {}
        let maxValue = 0
        for (const team of this.currentTeams.values()) {
            if (team.discord.server && team.discord.channel && team.discord.role) {
                const teamGuild = await this.client.guilds.fetch(team.discord.server)
                const teamRole = await teamGuild.roles.fetch(team.discord.role)
                maxValue = Math.max(teamRole.members.size, maxValue)
                memberCount[team.id] = teamRole.members.size
            } else {
                console.log(`Skipping team [${team.id}] ${team.name} as it has not been linked yet.`)
            }
        }
        return {members: memberCount, max: maxValue}
    }

    async getTeamRatioStringArray() {
        let ratioList: Array<string> = []
        let teamRatios = await this.getTeamRatios()
        let memberCount = teamRatios.members
        for (const teamId of Object.keys(memberCount)) {
            memberCount[teamId] = teamRatios.max - memberCount[teamId]
            ratioList.push(teamId)
            for (let index = 0; index < memberCount[teamId]; index++) {
                ratioList.push(teamId)
            }
        }
        return ratioList
    }

    async assignRandomTeam(interaction: Discord.ButtonInteraction) {
        let embed = new Discord.EmbedBuilder()
        try {
            let teamRatios = await this.getTeamRatioStringArray()
            if (teamRatios.length === 0) {
                embed.setTitle("No teams available.")
                embed.setDescription("Please try again later or contact a Councillor.")
                embed.setColor(Discord.Colors.Purple)
                await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
                return
            }

            const selectedTeamId = teamRatios[Math.floor(Math.random() * teamRatios.length)]
            let selectedTeam: Team = this.currentTeams.get(Number(selectedTeamId))

            await interaction.member.roles.add(selectedTeam.discord.role)

            embed.setTitle("Team Assigned")
            embed.setDescription(`You have joined Team ${selectedTeam.name}, congrats!`)
            embed.setColor(selectedTeam.colour)
            embed.setThumbnail(selectedTeam.logo_url)
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
            return
        } catch (e) {
            console.log(e)
            embed.setTitle("Failed to assign a team.")
            embed.setDescription("Please try again later or contact a Councillor.")
            embed.setColor(Discord.Colors.Red)
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
            return
        }
    }

    async updateCurrentTeams() {
        for (const teamId of JSON.parse(process.env.TEAMS_ACTIVE!) as Array<number>) {
            let teamRequest = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/fetch", {
                method: "POST",
                body: JSON.stringify({"id": teamId}),
                headers: {"Content-type": "application/json"}
            })
            let teamData = await teamRequest.json()
            this.currentTeams.set(teamData.id, teamData)
        }
    }

    async buildTeamEmbed(team: any) {
        let embed = new Discord.EmbedBuilder()
            .setAuthor({name: team.name, iconURL: team.logo_url})
            .setColor(team.colour)
            .setFields([
                {name: "ID", value: Discord.inlineCode(team.id), inline: true},
                {name: "Name", value: team.name, inline: true},
                {name: "Description", value: team.description, inline: false},
                {name: "Colour", value: Discord.inlineCode(team.colour), inline: true},
                {name: "Logo URL", value: team.logo_url, inline: true},
                {name: "Score", value: Discord.inlineCode(team.score), inline: true}
            ])
            .setThumbnail(team.logo_url)
        if (team.discord.server && team.discord.channel && team.discord.role) {
            const teamGuild = await this.client.guilds.fetch(team.discord.server)
            if (teamGuild) {
                embed.addFields([{
                    name: "Guild (Server)",
                    value: `**${teamGuild.name}** ${Discord.inlineCode(team.discord.server)}`,
                    inline: false
                }])
            } else {
                embed.addFields([{
                    name: "Guild (Server)",
                    value: `Guild Not Found! ${Discord.inlineCode(team.discord.server)}`,
                    inline: false
                }])
            }
            const teamChannel = await teamGuild.channels.fetch(team.discord.channel)
            if (teamChannel) {
                embed.addFields([{
                    name: "Channel",
                    value: `${Discord.inlineCode(teamChannel.name)} ${Discord.inlineCode(team.discord.channel)}`,
                    inline: false
                }])
            } else {
                embed.addFields([{
                    name: "Channel",
                    value: `Channel Not Found! ${Discord.inlineCode(team.discord.channel)}`,
                    inline: false
                }])
            }
            const teamRole = await teamGuild.roles.fetch(team.discord.role)
            if (teamRole) {
                embed.addFields([{
                    name: "Role",
                    value: `${Discord.inlineCode(teamRole.name)} ${Discord.inlineCode(team.discord.role)}`,
                    inline: false
                },{
                    name: "Members",
                    value: `${Discord.inlineCode(teamRole.members.size)}`,
                    inline: true
                }])
            } else {
                embed.addFields([{
                    name: "Role",
                    value: `Role Not Found! ${Discord.inlineCode(team.discord.role)}`,
                    inline: false
                }])
            }
        }
        return embed
    }
}