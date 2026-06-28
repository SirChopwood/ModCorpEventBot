// @ts-ignore
import * as Discord from "discord.js";

export default class Permissions {
    constructor() {
    }

    success(title: string, description: string = "") {
        return this.generic(title, description, "", Discord.Colors.Green)
    }

    failure(title: string, description: string = "") {
        return this.generic(title, description, "", Discord.Colors.Red)
    }

    warning(title: string, description: string = "") {
        return this.generic(title, description, "", Discord.Colors.Yellow)
    }

    generic(title: string, author: string = "", description: string = "", colour: Discord.ColorResolvable = Discord.Colors.Blurple): Discord.ContainerBuilder {
        let contents = ""
        if (author !== "") contents += `-# ${author}\n`
        if (title !== "") contents += `## ${title}\n`
        if (description !== "") contents += `${description}`

        return new Discord.ContainerBuilder()
            .setAccentColor(colour)
            .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(contents)
            )
    }

    thumbnail(author: string, title: string, description: string, image_url: string, colour: Discord.ColorResolvable = Discord.Colors.Blurple): Discord.ContainerBuilder {
        return new Discord.ContainerBuilder()
            .setAccentColor(colour)
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`-# ${author}\n## ${title}\n${description}`)
                )
                    .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                        .setURL(image_url)
                    )
            )
    }
}