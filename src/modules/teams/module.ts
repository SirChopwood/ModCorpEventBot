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

export default class TeamsModule extends DiscordBotModule {
    currentTeams: Discord.Collection<string, Team> = new Discord.Collection()
    events: Discord.Collection<string, TeamsEventType> = new Discord.Collection()
    spreadsheet: GoogleSpreadsheet
    eventTimer: NodeJS.Timeout | null = null

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Teams",
            desc: "The framework for the discord teams."
        })

        const googleJWT = new JWT({
            email: process.env.TEAMS_GOOGLE_EMAIL,
            key: process.env.TEAMS_GOOGLE_PRIVATEKEY!.split(String.raw`\n`).join('\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
        })
        this.spreadsheet = new GoogleSpreadsheet(process.env.TEAMS_GOOGLE_SHEET, googleJWT)

        bot.client.on(Discord.Events.InteractionCreate, async (interaction: Discord.Interaction) => {
            if (interaction.isButton() && interaction.customId.startsWith("team")) {
                if (interaction.customId.endsWith("assignment")) {
                    await this.assignRandomTeam(interaction)
                }
            }
        })
    }

    async initialise() {
        await this.mountEvents()
        await super.initialise()
        await this.startEventTimer()


        await this.updateCurrentTeams()
        setInterval(this.updateCurrentTeams.bind(this), 1000*60*10)
    }

    async deinitialise() {
        await super.deinitialise();
        if (this.eventTimer) {
            clearInterval(this.eventTimer)
        }
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        const interactionCustomIds = customId.split("-")
        if (interactionCustomIds[0] === "events"){
            const eventInteractionCustomId = customId.replace(`events-${interactionCustomIds[1]}-`, "")
            const eventClass = this.events.get(interactionCustomIds[1])
            await eventClass.onInteraction(interaction, eventInteractionCustomId)
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

                this.log(`Event: ${eventClass.name} - ${eventClass.desc}`)
            }
        } else {
            this.log(`No events found.`)
        }
    }

    async startEventTimer() {
        const timeGap = Number(process.env.TEAMS_EVENT_TIMER) // 120000ms = 2m | 900000ms = 15m | 3600000ms = 1h
        const nextEvent = timeGap - new Date().getTime() % timeGap // Gets ms until the next time gap period
        this.eventTimer = setTimeout(async () => {
            this.eventTimer = setInterval(this.triggerEvent.bind(this), timeGap)
            await this.triggerEvent()
        }, nextEvent)
    }

    async triggerEvent() {
        //let event: TeamsEventType = this.events.random()
        let event: TeamsEventType = this.events.get("anagrams")
        await event.prepareEvent()

        for (const team of this.currentTeams.values()) {
            await event.triggerEvent(team)
        }
    }

    async getSpreadsheet(sheetIndex: number) {
        const doc: GoogleSpreadsheet = this.spreadsheet
        await doc.loadInfo()
        let sheet: GoogleSpreadsheetWorksheet = await doc.sheetsByIndex[sheetIndex]
        await sheet.loadHeaderRow()
        const headers = sheet.headerValues
        return {document: doc, sheet: sheet, headers: headers}
    }
}