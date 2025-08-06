import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";

export default class CardsModule extends DiscordBotModule {

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Cards",
            desc: "Collect cards by doing certain actions.",
            colour: "yellow"
        });
    }

    async initialise(): Promise<void> {
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}