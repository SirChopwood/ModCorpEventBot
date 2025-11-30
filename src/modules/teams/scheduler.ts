import DiscordBot from "../../bot";
import {DiscordBotModuleType} from "../../module";

export default class EventScheduler {
    bot: DiscordBot
    module: DiscordBotModuleType
    name = "EventScheduler"

    constructor(bot: DiscordBot, module: DiscordBotModuleType) {
        this.bot = bot
        this.module = module
    }

    async start() {
        this.module.log(`Started Scheduler ${this.bot.chalk.yellow(this.name)}`)
    }

    async stop() {
        this.module.log(`Stopped Scheduler ${this.bot.chalk.yellow(this.name)}`)
    }
}