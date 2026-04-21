import DiscordBotModule, {DiscordBotModuleType, DiscordBotSubModule} from "../../module.js";
import DiscordBot from "../../bot";
import TeamsEvent, {TeamsEventType} from "./event.js";
// @ts-ignore
import * as Discord from "discord.js";
import TeamClass from "./team.js";
import TestTeamsEvent from "./events/testevent.js";

export default class TeamsModule extends DiscordBotModule {
    events: Discord.Collection<string, TeamsEventType> = new Discord.Collection()
    currentTeams: Discord.Collection<string, TeamClass> = new Discord.Collection()
    updateTimer: NodeJS.Timeout | undefined

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Teams",
            desc: "The framework for the discord teams.",
            colour: "red"
        })
    }

    async initialise() {
        await super.initialise()
        await new TeamsEventSubModule(this).initialise()
        this.updateTimer = setInterval(() => {
            this.updateActiveTeams()
        }, 30*1000)
        // setTimeout(async () => {
        //     let classConstructor = this.events.random()
        //     await new classConstructor().prepareGlobal()
        // }, 3*1000)
    }

    async deinitialise() {
        await super.deinitialise()
        clearInterval(this.updateTimer)
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        const interactionCustomIds = customId.split("-")
        switch (interactionCustomIds[0]) {
            case "events":
                const eventInteractionCustomId = customId.replace(`events-${interactionCustomIds[1]}-`, "")
                const eventClass = this.events.get(interactionCustomIds[1])
                await eventClass.onInteraction(interaction, eventInteractionCustomId)
                return
            case "assignment":
                await this.assignRandomTeam(interaction)
                return
            case "ping":
                await this.togglePingPreference(interaction)
                return
        }
    }

    async updateActiveTeams() {
        let teamsRequest = await fetch(`${process.env.API_HOST}/api/teams_v2/team/fetch`, {
            method: "POST",
            body: JSON.stringify({team_ids: []}),
            headers: {"Content-type": "application/json"}
        })
        if (!teamsRequest.ok) {return false}
        let teamsData = await teamsRequest.json()
        if (teamsData.length > 0) {
            this.currentTeams.clear()
            for (const team of teamsData) {
                let teamClass = new TeamClass(team)
                await teamClass.fetchDiscordData(this.bot, team)
                this.currentTeams.set(team.id, teamClass)
            }
        }
    }

    async getTeamRatios() {
        let memberCount: Record<string, number> = {}
        let maxValue = 0
        for (const team of this.currentTeams.values()) {
            if (team.discord.server && team.discord.channel && team.discord.role) {
                maxValue = Math.max(team.role.members.size, maxValue)
                memberCount[team.id] = team.role.members.size
            } else {
                this.log(`Skipping team [${team.id}] ${team.name} as it has not been linked yet.`)
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
        let embed
        try {
            for (const team of this.currentTeams.values()) {
                if (interaction.member.roles.cache.has(team.role)) {
                    embed = this.bot.embeds.failure("Failed to assign a team.", "You already have a team.")
                    await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                    return
                }
            }

            let teamRatios = await this.getTeamRatioStringArray()
            if (teamRatios.length === 0) {
                embed = this.bot.embeds.warning("No teams available.", "Please try again later or contact an Event Manager.")
                await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                return
            }

            const selectedTeamId = teamRatios[Math.floor(Math.random() * teamRatios.length)]
            let selectedTeam: TeamClass = this.currentTeams.get(Number(selectedTeamId))

            await interaction.member.roles.add(selectedTeam.role)

            embed = this.bot.embeds.thumbnail(
                "",
                "Team Assigned",
                `You have joined Team ${selectedTeam.name}, congrats!`,
                selectedTeam.logo_url,
                selectedTeam.colour
            )
            await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
            return
        } catch (e) {
            this.log(e)
            embed = this.bot.embeds.failure("Failed to assign a team.", "Please try again later or contact an Event Manager.")
            await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
            return
        }
    }

    async togglePingPreference(interaction: Discord.StringSelectMenuInteraction) {
        let embed
        try {
            if (interaction.values[0] === "opt-in") {
                await interaction.member.roles.add(process.env.TEAMS_PING_ROLE)
                embed = this.bot.embeds.success("You have been assigned the Role.", "You can opt out at any time by re-pressing this button.")
            } else if (interaction.values[0] === "opt-out") {
                await interaction.member.roles.remove(process.env.TEAMS_PING_ROLE)
                embed = this.bot.embeds.success("The Role has been removed.", "You can opt back in at any time by re-pressing this button.")
            }
        } catch (e) {
            this.log(e)
            embed = this.bot.embeds.failure("Failed to toggle your Role.", "Please try again later or contact an Event Manager.")
        }
        await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
        return
    }

    async buildTeamEmbed(team: TeamClass) {
        let message = new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor(team.colour))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# ${team.name}\n-# ID: ${team.id}`),
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
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
                    Role: **@${team.role.name}**\n-# ${team.role.id}\nMember Count: ${team.role.members.size}
                    `)
            ])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                Role: **Role Not Found!**
                `)])
        }
        return message
    }
}

export class TeamsEventSubModule extends DiscordBotSubModule {

    constructor(module: DiscordBotModuleType) {
        super(module, "events")
    }

    async initialise() {
        await super.initialise()
    }

    protected async registerFile(name: string, path: string, data: any) {
        await super.registerFile(name, path, data)
        this.module.events.set(name.toLowerCase(), data)
        this.module.log(`${this.module.bot.chalk.greenBright("Event")}: ${name}`)
    }
}