import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";

export default class CoreModule extends DiscordBotModule {
    override name = "Core"
    override desc = "Base functionality for the bot."

    constructor(bot: DiscordBot, path: string) {
        super(bot, path);
    }

    async initialise(): Promise<void> {
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}