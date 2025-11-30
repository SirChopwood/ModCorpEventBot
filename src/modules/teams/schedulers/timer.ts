import EventScheduler from "../scheduler.js";

export default class TimerEventScheduler extends EventScheduler {
    eventTimer: NodeJS.Timeout | null = null
    name = "Timer"

    async start() {
        const timeGap = Number(process.env.TEAMS_EVENT_TIMER) // 120000ms = 2m | 900000ms = 15m | 3600000ms = 1h
        const nextEvent = timeGap - new Date().getTime() % timeGap // Gets ms until the next time gap period
        this.eventTimer = setTimeout(async () => {
            this.eventTimer = setInterval(this.module.triggerEvent.bind(this.module), timeGap)
            await this.module.triggerEvent()
        }, nextEvent)
        await super.start()
    }

    async stop() {
        if (this.eventTimer) {
            clearInterval(this.eventTimer)
        }
        await super.stop()
    }
}