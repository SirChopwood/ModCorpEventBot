import EventScheduler from "../scheduler.js";

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

        if (currentHours >= 7 && currentHours <= 14) { // Skip between 7am and 2pm
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
}