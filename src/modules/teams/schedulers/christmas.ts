import EventScheduler from "../scheduler.js";
// @ts-ignore
import * as Discord from "discord.js";
import {Team} from "../teams";
import TeamClass from "../team";

export default class TimerEventScheduler extends EventScheduler {
    eventTimer: NodeJS.Timeout | null = null
    name = "Christmas Event 2025"

    async start() {
        const timeGap = Number(process.env.TEAMS_EVENT_TIMER) // 120000ms = 2m | 900000ms = 15m | 3600000ms = 1h
        const nextEvent = timeGap - new Date().getTime() % timeGap // Gets ms until the next time gap period
        this.eventTimer = setTimeout(async () => {
            this.eventTimer = setInterval(this.selectEvent.bind(this), timeGap)
            await this.selectEvent()
        }, nextEvent)
        await super.start()
    }

    async stop() {
        if (this.eventTimer) {
            clearInterval(this.eventTimer)
        }
        await super.stop()
    }

    async selectEvent() {
        const currentHours = new Date().getUTCHours()
        const currentMins = new Date().getUTCMinutes()

        if ((currentHours === 7 && currentMins < 5) || (currentHours === 6 && currentMins > 55)) {
            this.module.log(`It is ${currentHours}:${currentMins} - Starting Downtime!`)
            await this.sendTeamUpdate(`## Downtime has begun!\nTrivia, Anagrams and Boss Fights will now pause until Uptime resumes tomorrow.`)

        } else if ((currentHours === 14 && currentMins < 5) || (currentHours === 13 && currentMins > 55)) {
            this.module.log(`It is ${currentHours}:${currentMins} - Starting Uptime!`)
            await this.sendTeamUpdate(`## Uptime has begun!\nTrivia, Anagrams and Boss Fights will start soon.`)
            setTimeout(async () => {await this.module.triggerEvent(["snowballbossfight"])}, 60000)

        } else if (currentHours >= 7 && currentHours < 14) { // Skip between 7am and 2pm
            this.module.log(`It is ${currentHours}:${currentMins} - Skipping due to Downtime!`)
            return

        } else if (currentMins < 5 || currentMins > 55) { // Trigger bosses at the hour
            this.module.log(`It is ${currentHours}:${currentMins} - Boss time!`)
            await this.module.triggerEvent(["snowballbossfight"])

        } else { // Do random events during uptime
            this.module.log(`It is ${currentHours}:${currentMins} - Running Random Event!`)
            await this.module.triggerEvent(["anagrams", "trivia"])
        }
    }

    async sendTeamUpdate(text: string) {
        let scores: Array<TeamClass> = this.module.currentTeams.values()
            .toArray()
            .sort((a: TeamClass, b: TeamClass) => {return a.score - b.score})
            .reverse()
        const medals = [":first_place:", ":second_place:", ":third_place:"]

        for (const position in scores) {
            let team = scores[position]

            let posText = `${String(Number(position)+Number(1))} ${Number(position) < 3 ? medals[position] : ":medal:"}`


            let message = new Discord.ContainerBuilder()
                .setAccentColor(Discord.resolveColor(team.colour))
                .addSectionComponents((section: Discord.SectionBuilder) => section
                    .addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`# ${team.name}\nTeam ${team.name}'s current position: ${posText}`)
                    ])
                    .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                        .setURL(team.logo_url)
                    )
                )
                .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(text)
                ])

            let sentMessage = await team.channel.send({
                components: [message],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }
    }
}