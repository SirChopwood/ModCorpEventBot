import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {ERaidsClasses} from "./datatypes.js";
import {RaidsRaid} from "./raids.js";
import {TestRaid} from "./data/testraid.js";
import TwitchModule from "../twitch/module.js";
import TeamsModule from "../teams/module.js";

export default class RaidsModule extends DiscordBotModule {
    twitch: TwitchModule | undefined
    teams: TeamsModule | undefined
    raid: RaidsRaid | undefined

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Raids",
            desc: "Interactive Raids on Discord & Twitch.",
            colour: "blueBright"
        })
    }

    async initialise(): Promise<void> {
        await super.initialise();

        setTimeout(async () => {
            if (!await this.resumeRaid()) {
                await this.createRaid()
            }
        }, 2000)
    }

    async createRaid() {

    }

    async resumeRaid() {
        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/fetch`, {
            method: "POST",
            body: JSON.stringify({}),
            headers: {"Content-type": "application/json"}
        })
        if (res.ok) {
            let data = await res.json()
            if (data && data.length > 0) {
                this.raid = new TestRaid(this, data.id)
                await this.raid.startRaid()
                return true
            }
            return false
        } else {
            this.log("Failed to fetch raid data.")
            return false
        }
    }

    override async postInit(): Promise<void> {
        this.twitch = await this.bot.requireModule("twitch", TwitchModule)
        this.teams = await this.bot.requireModule("teams", TeamsModule)

        await super.postInit();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async onInteraction(interaction: Discord.StringSelectMenuInteraction, customId: string) {
        const interactionCustomIds = customId.split("-")
        switch (interactionCustomIds[0]) {
            case "encounter":
                if (!this.raid) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("Raid not Found", "Something went wrong, please try again or speak to Ramiris.")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }

                let currentEncounter = this.raid.getCurrentEncounter()
                if (!currentEncounter
                    || interactionCustomIds[1] !== currentEncounter.roundId) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("Encounter not Found", "Something went wrong, please try again or speak to Ramiris.")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }

                if (!currentEncounter.acceptingInput) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("Round not accepting input", "Round has ended/is ending and is no longer accepting input.")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }

                let currentRound = currentEncounter?.getCurrentRound()
                if (!currentRound) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("Round not Found", "Something went wrong, please try again or speak to Ramiris.")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }

                let user = this.raid.userStats.get(interaction.user.id)
                if (!user) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("User not found", "Have you joined a team and picked a class first?")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }
                let selectionIndex = Number(interaction.values[0])
                let selection = currentRound.options[selectionIndex]

                if (!user.choices[this.raid.encounterIndex]) {
                    user.choices[this.raid.encounterIndex] = []
                }
                if (!user.choices[this.raid.encounterIndex][currentEncounter.currentRoundIndex]) {
                    user.choices[this.raid.encounterIndex][currentEncounter.currentRoundIndex] = {
                        success: false,
                        choiceIndex: selectionIndex,
                        roll: -1
                    }
                } else {
                    user.choices[this.raid.encounterIndex][currentEncounter.currentRoundIndex].choiceIndex = selectionIndex
                }

                this.raid.userStats.set(interaction.user.id, user)
                currentEncounter.interactionCache.set(interaction.user.id, interaction)
                let res = await fetch(`${process.env.API_HOST}/api/raids_v2/user/choice`, {
                    method: "POST",
                    body: JSON.stringify({
                        "token": process.env.API_TOKEN,
                        "user_id": interaction.user.id,
                        "raid_id": this.raid.id,
                        "choices": user.choices
                    }),
                    headers: {"Content-type": "application/json"}
                })
                if (res.ok) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.success("Selection Accepted", `"${selection.texts.selection}"`)],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                } else {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("Choice failed to save.", "Something went wrong, please try again or speak to Ramiris.")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }
        }
    }
}