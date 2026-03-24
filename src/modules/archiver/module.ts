import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";

export default class CoreModule extends DiscordBotModule {
    targetChannels: Discord.Collection<Discord.Snowflake, {
        guild: Discord.Snowflake,
        channel: Discord.Snowflake
    }> = new Discord.Collection() // Discord User -> Target Channel & Guild

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Archiver",
            desc: "Adds the ability to archive channels across discords.",
            colour: "yellow"
        })
    }

    async initialise(): Promise<void> {
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}