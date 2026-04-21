// @ts-ignore
import * as Discord from "discord.js";

export default class Permissions {
    constructor() {
    }

    success(title: string, description: string) {
        return this.generic("Success", title, description, Discord.Colors.Green)
    }

    failure(title: string, description: string) {
        return this.generic("Failure", title, description, Discord.Colors.Red)
    }

    warning(title: string, description: string) {
        return this.generic("Warning", title, description, Discord.Colors.Yellow)
    }

    generic(author: string, title: string, description: string, colour: Discord.ColorResolvable = Discord.Colors.Blurple): Partial<Discord.APIContainerComponent> {
        return new Discord.ContainerBuilder()
            .setAccentColor(colour)
            .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) =>
                textDisplay.setContent(`-# ${author}\n## ${title}`)
            )
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
            .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) =>
                textDisplay.setContent(description)
            )
    }
}