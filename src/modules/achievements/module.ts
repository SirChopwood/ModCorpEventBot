import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";

export default class AchievementsModule extends DiscordBotModule {


    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Achievements",
            desc: "The ability to give out awards and achievements to users.",
            colour: "magentaBright"
        });
    }

    async initialise(): Promise<void> {
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}