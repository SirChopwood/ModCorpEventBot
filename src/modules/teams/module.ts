import DiscordBotModule, {DiscordBotModuleType, DiscordBotSubModule} from "../../module.js";
import DiscordBot from "../../bot";
import TeamsEvent, {TeamsEventType} from "./event.js";
// @ts-ignore
import * as Discord from "discord.js";
import TeamClass from "./team.js";
import Embeds from "./embeds.js";

export default class TeamsModule extends DiscordBotModule {
    embeds: Embeds
    events: Discord.Collection<string, TeamsEventType> = new Discord.Collection()
    currentTeams: Discord.Collection<string, TeamClass> = new Discord.Collection()
    updateTimer: NodeJS.Timeout | undefined
    currentEvent: TeamsEventType | undefined

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Teams",
            desc: "The framework for the discord teams.",
            colour: "red"
        })
        this.embeds = new Embeds(this.bot)
    }

    async initialise() {
        await super.initialise()
        await new TeamsEventSubModule(this).initialise()
        await this.updateActiveTeams()
        this.updateTimer = setInterval(async () => {
            await this.updateActiveTeams()
        }, 30*1000)
        // setTimeout(async () => {
        //     let classConstructor = this.events.random()
        //     this.currentEvent = await new classConstructor(this)
        //     await this.currentEvent!.initialise()
        //     await this.currentEvent!.prepareEvent()
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
                if (this.currentEvent) {
                    const eventInteractionCustomId = customId.replace(`events-`, "")
                    await this.currentEvent.onInteraction(interaction, eventInteractionCustomId)
                } else {
                    let embed = this.bot.embeds.failure("Interaction Failed", "There is no event active at the moment.")
                    await interaction.reply({components: [embed], flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]})
                }
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
        this.log(`Calculating all team Ratios/Member counts`)
        let memberCount: Record<string, number> = {}
        let maxValue = 0
        //let totalCounts = await this.bot.fetchAllGuildMemberCounts()
        for (const team of this.currentTeams.values()) {
            if (team.guild && team.channel && team.role) {
                try {
                    let roleCounts = await this.bot.getGuildMemberCounts(team.guild.id)
                    let roleCount = roleCounts.get(team.role.id)
                    maxValue = Math.max(roleCount, maxValue)
                    memberCount[team.id] = roleCount
                    this.log(this.bot.chalk.grey(`- [${team.id}] ${team.name} has ${this.bot.chalk.cyan(roleCount)} members.`))
                } catch (e) {
                    this.log(`Failed to find role count for team [${team.id}] ${team.name}.`)
                    this.log(e)
                }
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
            await interaction.guild.members.fetch(interaction.user.id)
            for (const team of this.currentTeams.values()) {
                if (interaction.member.roles.cache.has(team.role.id)) {
                    embed = this.bot.embeds.failure("Failed to assign a team.", `You already a member of Team ${team.name}.`)
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

            try {
                let cache = this.bot.memberCountCache.get(selectedTeam.guild.id)
                let value = cache!.get(selectedTeam.role.id)
                cache!.set(selectedTeam.role.id, value+1)
                this.bot.memberCountCache.set(selectedTeam.guild.id, cache)
            } catch (e) {
                this.log("Failed to update role cache")
                this.log(e)
            }

            this.log(`Assigned ${interaction.member.displayName} to Team [${selectedTeam.id}] ${selectedTeam.name}`)
            embed = this.bot.embeds.thumbnail(
                "Team Assigned",
                `Welcome to Team ${selectedTeam.name}!`,
                `Congratulations on joining your team, go ahead and join the other Team ${selectedTeam.name} campers.`,
                selectedTeam.icon_url,
                Discord.resolveColor(selectedTeam.colour)
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

    getMemberTeam(member: Discord.GuildMember): TeamClass | undefined {
        for (const team of this.currentTeams.values()) {
            if (this.isMemberInTeam(member, team)) {
                return team
            }
        }
        return undefined
    }

    isMemberInTeam(member: Discord.GuildMember, team: TeamClass): boolean {
        return member.roles.cache.has(team.role.id)
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
        let tempClass = new data(this.module, {}) as TeamsEvent
        await tempClass.initialise()
        this.module.events.set(tempClass.commandName, data)
        this.module.log(`${this.module.bot.chalk.greenBright("Event")}: ${tempClass.name} ${this.module.bot.chalk.grey(` - ${tempClass.description}`)}`)
    }
}