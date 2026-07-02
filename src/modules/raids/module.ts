import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {ERaidsClasses} from "./datatypes.js";
import {RaidsCampaign} from "./raids.js";
import {TestCampaign} from "./data/testraid.js";
import TwitchModule from "../twitch/module.js";
import TeamsModule from "../teams/module.js";

export default class RaidsModule extends DiscordBotModule {
    twitch: TwitchModule | undefined
    teams: TeamsModule | undefined
    campaign: RaidsCampaign | undefined

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
            this.campaign = new TestCampaign(this)
            await this.campaign.startCampaign()
        }, 2000)
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
                if (!this.campaign) {
                    await interaction.reply({
                        content: null,
                        components: [this.bot.embeds.failure("Campaign not Found", "Something went wrong, please try again or speak to Ramiris.")],
                        flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                    })
                    return
                }

                let currentEncounter = this.campaign.getCurrentEncounter()
                if (!currentEncounter
                    || Number(interactionCustomIds[1]) !== currentEncounter.roundId) {
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

                let user = this.campaign.userStats.get(interaction.user.id)
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

                if (!user.choices[this.campaign.encounterIndex]) {
                    user.choices[this.campaign.encounterIndex] = []
                }
                if (!user.choices[this.campaign.encounterIndex][currentEncounter.currentRoundIndex]) {
                    user.choices[this.campaign.encounterIndex][currentEncounter.currentRoundIndex] = {
                        success: false,
                        choiceIndex: selectionIndex,
                        roll: -1
                    }
                } else {
                    user.choices[this.campaign.encounterIndex][currentEncounter.currentRoundIndex].choiceIndex = selectionIndex
                }

                this.campaign.userStats.set(interaction.user.id, user)
                currentEncounter.interactionCache.set(interaction.user.id, interaction)

                await interaction.reply({
                    content: null,
                    components: [this.bot.embeds.success("Selection Accepted", `"${selection.texts.selection}"`)],
                    flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                })
                return
        }
    }
}