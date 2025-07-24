import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";

export default class CoreModule extends DiscordBotModule {


    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Core",
            desc: "Base functionality for the bot."
        });
    }

    async initialise(): Promise<void> {
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}