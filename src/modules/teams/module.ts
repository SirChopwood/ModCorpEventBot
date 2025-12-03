// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../bot";
import DiscordBotModule from "../../module.js";
import {Team} from "./teams";
import fs from "node:fs";
import path from "path";
import {TeamsEventType} from "./event";
// @ts-ignore
import {GoogleSpreadsheet, GoogleSpreadsheetWorksheet} from 'google-spreadsheet';
// @ts-ignore
import { JWT } from 'google-auth-library';
import EventScheduler from "./scheduler.js";

export default class TeamsModule extends DiscordBotModule {
    currentTeams: Discord.Collection<string, Team> = new Discord.Collection()
    events: Discord.Collection<string, TeamsEventType> = new Discord.Collection()
    spreadsheet: GoogleSpreadsheet
    scheduler: EventScheduler | null = null;

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Teams",
            desc: "The framework for the discord teams.",
            colour: "red"
        })

        const googleJWT = new JWT({
            email: process.env.TEAMS_GOOGLE_EMAIL,
            key: process.env.TEAMS_GOOGLE_PRIVATEKEY!.split(String.raw`\n`).join('\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
        })
        this.spreadsheet = new GoogleSpreadsheet(process.env.TEAMS_GOOGLE_SHEET, googleJWT)
    }

    async initialise() {
        await this.mountEvents()
        await super.initialise()

        let schedulerPath = process.env.TEAMS_SCHEDULER || "timer.js"
        let {default: scheduler} = await import(path.join("file://", path.dirname(this.path), "schedulers", schedulerPath))
        this.scheduler = new scheduler(this.bot, this)
        if (this.scheduler !== null) {
            await this.scheduler.start()
        }

        await this.updateCurrentTeams()
        setInterval(this.updateCurrentTeams.bind(this), 1000*60*10)
    }

    async deinitialise() {
        if (this.scheduler !== null) {
            await this.scheduler.stop()
        }
        await super.deinitialise();
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        const interactionCustomIds = customId.split("-")
        if (interactionCustomIds[0] === "events"){
            const eventInteractionCustomId = customId.replace(`events-${interactionCustomIds[1]}-`, "")
            const eventClass = this.events.get(interactionCustomIds[1])
            await eventClass.onInteraction(interaction, eventInteractionCustomId)
        } else if (interactionCustomIds[0] === "assignment"){
            await this.assignRandomTeam(interaction)
        }
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
        let embed = new Discord.EmbedBuilder()
        try {
            for (const team of this.currentTeams.values()) {
                if (interaction.member.roles.cache.has(team.discord.role)) {
                    embed.setTitle("Failed to assign a team.")
                    embed.setDescription("You already have a team.")
                    embed.setColor(Discord.Colors.Red)
                    await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
                    return
                }
            }

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
            this.log(e)
            embed.setTitle("Failed to assign a team.")
            embed.setDescription("Please try again later or contact an Event Manager.")
            embed.setColor(Discord.Colors.Red)
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
            return
        }
    }

    async updateCurrentTeams() {
        for (const teamId of JSON.parse(process.env.TEAMS_ACTIVE!) as Array<number>) {
            let teamRequest = await fetch(`${process.env.API_HOST}/api/v1/modcorp/teams/fetch`, {
                method: "POST",
                body: JSON.stringify({"id": teamId}),
                headers: {"Content-type": "application/json"}
            })
            let teamData = await teamRequest.json()
            this.currentTeams.set(teamData.id, teamData)
        }
    }

    async buildTeamEmbed(team: Team) {
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
        const teamGuild = await this.client.guilds.fetch(team.discord.server)
        if (teamGuild) {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                Guild: **${teamGuild.name}**\n-# ${team.discord.server}
                `)])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                Guild: **Guild Not Found!**\n-# ${team.discord.server}
                `)])
        }
        const teamChannel = await teamGuild.channels.fetch(team.discord.channel)
        if (teamChannel) {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                Channel: **#${teamChannel.name}**\n-# ${team.discord.channel}
                `)])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                Channel: **Channel Not Found!**\n-# ${team.discord.channel}
                `)])
        }
        const teamRole = await teamGuild.roles.fetch(team.discord.role)
        if (teamRole) {
            message.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`
                    Role: **@${teamRole.name}**\n-# ${team.discord.role}\nMember Count: ${teamRole.members.size}
                    `)
            ])
        } else {
            message.addTextDisplayComponents([(textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`
                Role: **Role Not Found!**\n-# ${team.discord.role}
                `)])
        }
        return message
    }

    async mountEvents() {
        const eventsPath = path.join(path.dirname(this.path), "events")
        if (fs.existsSync(eventsPath)) {
            const foundEvents = fs.readdirSync(eventsPath, { withFileTypes: true, recursive: true })
                .filter(dirent => !dirent.isDirectory())
                .map(dirent => dirent.name)
            for (const event of foundEvents) {
                let {default: eventClass} = await import(path.join("file://", eventsPath, event))
                let newEvent = new eventClass(this.bot, this)
                this.events.set(newEvent.commandName, newEvent)

                this.log(`${this.bot.chalk.greenBright("Event")}: ${newEvent.name} ${this.bot.chalk.grey(`(${newEvent.commandName}) - ${newEvent.desc}`)}`)
            }
        } else {
            this.log(`No events found.`)
        }
    }

    async triggerEvent(eventNames: Array<string> = [], invert: boolean = false) {
        let eventName = ""
        try {
            let event: TeamsEventType
            if (eventNames.length === 0) {
                event = this.events.random()
                eventName = event.commandName
            } else if (invert) {
                let events = this.events.keys().toArray()
                while (true) {
                    eventName = events[Math.floor(Math.random()*(events.length - 1))]
                    if (!eventNames.includes(eventName)) {
                        break
                    }
                }
                event = this.events.get(eventName)
            } else if (eventNames.length === 1) {
                eventName = eventNames[0]
                event = this.events.get(eventName)
            } else {
                eventName = eventNames[Math.floor(Math.random()*(eventNames.length))]
                event = this.events.get(eventName)
            }
            if (!event) {
                this.log(`Invalid Event given (${this.bot.chalk.redBright(eventName)}), cancelling trigger.`)
                return
            }

            await event.prepareEvent()

            for (const team of this.currentTeams.values()) {
                await event.triggerEvent(team)
            }
        } catch (e) {
            this.log(`Error Triggering ${this.bot.chalk.redBright(eventName)}`)
            this.log(e)
            return
        }

    }

    async getSpreadsheet(sheetIndex: number) {
        await this.spreadsheet.loadInfo()
        let sheet: GoogleSpreadsheetWorksheet = this.spreadsheet.sheetsByIndex[sheetIndex]
        await sheet.loadHeaderRow()
        const headers = sheet.headerValues
        return {document: this.spreadsheet, sheet: sheet, headers: headers}
    }
}