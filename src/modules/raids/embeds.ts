// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../bot.js";
import {ERaidsCharacteristics, ERaidsClasses, RaidsClass} from "./datatypes.js";

export default class Embeds {
    bot: DiscordBot

    constructor(bot: DiscordBot) {
        this.bot = bot
    }

    async classSelectionHeader(classes: Record<ERaidsClasses, RaidsClass>) {
        let classOptions: Array<Discord.SelectMenuOptionBuilder> = []

        for (let classKey of Object.keys(classes)) {
            // @ts-ignore
            let classValue: RaidsClass = classes[classKey]
            classOptions.push(new Discord.StringSelectMenuOptionBuilder()
                .setLabel(classValue.name)
                .setValue(classKey)
                .setDescription(classValue.description)
            )
        }

        return this.bot.embeds.generic(
            "Class Selection",
            "",
            "**Please select a class below.**\nYou may browse through the different options on the dropdown before confirming with the button."
        ).addActionRowComponents(
            new Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId("raids-class-selection")
                        .setPlaceholder("Please select a class...")
                        .addOptions(classOptions),
                ),
        )
    }

    async classSelectionDescription(classes: Record<ERaidsClasses, RaidsClass>, selected: ERaidsClasses, disabled = false) {
        let selection = classes[selected]
        let classStats = "### Stats"

        for (let statKey of Object.keys(selection.modifiers)) {
            // @ts-ignore
            let statValue: number = selection.modifiers[Number(statKey)]
            classStats += `\n ${ERaidsCharacteristics[Number(statKey)]}: ${statValue}`
        }

        return new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor(selection.colour))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(`## ${selection.name}\n${selection.description}`)
                )
                .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                    .setURL(selection.icon)
                )
            )
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents((textDisplay: Discord.TextDisplayBuilder) => textDisplay
                    .setContent(classStats)
                )
                .setButtonAccessory(
                    new Discord.ButtonBuilder()
                        .setCustomId("raids-class-confirm")
                        .setLabel(`Click to confirm: ${selection.name}`)
                        .setStyle(Discord.ButtonStyle.Secondary)
                        .setDisabled(disabled)
                )
            )
    }
}