// @ts-ignore
import * as Discord from "discord.js";
// @ts-ignore
import {ApplicationCommandType} from "discord.js";
import DiscordBot from "../../../bot.js";


export default {
    data: new Discord.ContextMenuCommandBuilder()
        .setName('award achievement')
        .setType(ApplicationCommandType.User),
    data2: new Discord.SlashCommandBuilder()
        .setName('award')
        .setDescription("Award an achievement to a user"),
    async execute(bot: DiscordBot, interaction: Discord.Interaction) {
        let achievementsRes = await fetch(`${process.env.API_HOST}/api/v1/modcorp/achievements/fetch`, {
            method: "POST",
            body: JSON.stringify({"all": true}),
            headers: {"Content-type": "application/json"}
        })
        if (!achievementsRes.ok) {
            await interaction.reply({
                content: "Failed to load Achievements.",
                flags: [Discord.MessageFlags.Ephemeral]
            })
        }

        let data = await achievementsRes.json()
        if (!data || data.length === 0) {
            await interaction.reply({
                content: "Failed to load Achievements.",
                flags: [Discord.MessageFlags.Ephemeral]
            })
        }

        let achSelect = new Discord.StringSelectMenuBuilder()
            .setCustomId("achievements-award-targetid")
            .setPlaceholder("No Achievement Selected...")
        for (let ach of data) {
            achSelect.addOptions(
                new Discord.StringSelectMenuOptionBuilder()
                    .setLabel(ach.name)
                    .setDescription(ach.description)
                    .setValue(String(ach.id))
            )
        }

        let targetUser = []
        if (interaction.isContextMenuCommand()) {
            targetUser.push(interaction.targetUser.id)
        }

        let modal = new Discord.ModalBuilder()
            .setCustomId("achievements-award-modal")
            .setTitle("Award an Achievement")
            .addTextDisplayComponents(
                new Discord.TextDisplayBuilder()
                    .setContent(`You are about to award an achievement. Please select below the target user, achievement (with optional tier) and optionally a reasoning.`),
            )
            .addLabelComponents(
                new Discord.LabelBuilder()
                    .setLabel("Target User")
                    .setUserSelectMenuComponent(
                        new Discord.UserSelectMenuBuilder()
                            .setCustomId("achievements-award-targetuser")
                            .setRequired(true)
                            .setMaxValues(1)
                            .setMinValues(1)
                            .setDefaultUsers(targetUser)
                    ),
                new Discord.LabelBuilder()
                    .setLabel("Select the Achievement to give.")
                    .setStringSelectMenuComponent(achSelect),
                new Discord.LabelBuilder()
                    .setLabel("What tier of the award? (Number)")
                    .setTextInputComponent(
                        new Discord.TextInputBuilder()
                            .setRequired(false)
                            .setPlaceholder("(Number if applicable)")
                            .setStyle("Short")
                            .setCustomId("achievements-award-tier")
                    ),
                new Discord.LabelBuilder()
                    .setLabel("Give a reason for the award.")
                    .setTextInputComponent(
                        new Discord.TextInputBuilder()
                            .setRequired(false)
                            .setPlaceholder("(Optional)")
                            .setStyle("Short")
                            .setCustomId("achievements-award-reason")
                    )
            )
        await interaction.showModal(modal)
    }
};