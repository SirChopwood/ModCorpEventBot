import DiscordBotModule, {DiscordBotModuleType, DiscordBotSubModule} from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import * as Discord from "discord.js";
import {ERaidsClasses} from "./datatypes.js";
import {RaidsRaid} from "./raids.js";
import TwitchModule from "../twitch/module.js";
import TeamsModule from "../teams/module.js";
import Embeds from "./embeds.js";
import {RaidsClassData} from "./data/classes.js";

export default class RaidsModule extends DiscordBotModule {
    embeds: Embeds
    twitch: TwitchModule | undefined
    teams: TeamsModule | undefined
    raid: RaidsRaid | undefined
    classSelections: Discord.Collection<Discord.Snowflake, ERaidsClasses> = new Discord.Collection()
    classSelectionInteractions: Discord.Collection<Discord.Snowflake, Discord.Interaction> = new Discord.Collection()
    timings = { // AMOUNT OF MINUTES FOR EACH DELAY
        // Time between the raid being announced and the first encounter.
        classSelection: 15/5,
        // Time between the last encounter ending and the next starting.
        nextEncounter: 10/5,
        // Time between the last round ending and the next starting.
        nextRound: 3/5,
        // Time given to select an action for each round.
        actionSelection: 5/5,
        // Delay after the final encounter to end the raid.
        endRaid: 2/5
    }

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Raids",
            desc: "Interactive Raids on Discord & Twitch.",
            colour: "blueBright"
        })
        this.embeds = new Embeds(this.bot)
    }

    async initialise(): Promise<void> {
        await super.initialise();
        await new RaidsSubModule(this).initialise()
    }

    async createRaid(classPath: string) {
        let raids = this.subModules.get("raids") as RaidsSubModule
        console.log(classPath)
        if (!raids.raidClasses.has(classPath)) {
            this.log(`Unable to locate raid ${classPath} to create`)
            return false
        }

        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/create`, {
            method: "POST",
            body: JSON.stringify({
                "token": process.env.API_TOKEN,
                "path": classPath
            }),
            headers: {"Content-type": "application/json"}
        })
        if (res.ok) {
            let data = await res.json()
            if (data[0]) {
                return await this.loadRaid(data[0].path, data[0].id)
            }
            return false
        } else {
            this.log("Failed to fetch raid data.")
            return false
        }
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
                return await this.loadRaid(data[0].path, data[0].id, data[0].encounterIndex, data[0].roundIndex)
            }
            return false
        } else {
            this.log("Failed to fetch raid data.")
            return false
        }
    }

    async loadRaid(classPath: string, raidId: number, encounterIndex?: number, roundIndex?: number) {
        try {
            let raids = this.subModules.get("raids") as RaidsSubModule
            console.log(classPath)
            if (!raids.raidClasses.has(classPath)) {
                this.log(`Unable to locate raid ${classPath} to load.`)
                return false
            }
            let raidClass = raids.raidClasses.get(classPath)
            this.raid = new raidClass(this, raidId, encounterIndex, roundIndex) as RaidsRaid
            await this.raid.initialise()
            await this.raid.startRaid()
            return true
        } catch (error) {
            this.log(error)
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

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        const interactionCustomIds = customId.split("-")
        switch (interactionCustomIds[0]) {
            case "encounter":
                await this.selectRoundAction(interaction)
                break
            case "class":
                switch (interactionCustomIds[1]) {
                    case "selection":
                        this.classSelections.set(interaction.user.id, interaction.values[0])
                        await this.updateClassSelectionDescription(interaction)
                        return
                    case "confirm":
                        try {
                            await this.setUserClass(interaction)
                        } catch (error) {
                            await interaction.reply({
                                components: [this.bot.embeds.failure("Class Selection Not Saved.", "Something went wrong, please try again or speak to Ramiris.")],
                                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                            })
                        }
                        return
                }
                break
        }
    }

    async selectRoundAction(interaction: Discord.StringSelectMenuInteraction) {
        if (!this.raid) {
            await interaction.reply({
                content: null,
                components: [this.bot.embeds.failure("Raid not Found", "Something went wrong, please try again or speak to Ramiris.")],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            return
        }

        let currentEncounter = this.raid.getCurrentEncounter()
        if (!currentEncounter) {
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
        if (!currentRound ||
            currentEncounter.roundId !== `${this.raid.id}-${this.raid.encounterIndex}-${currentEncounter.currentRoundIndex}`
        ) {
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
            this.log(res.status, res.statusText, res.text())
            return
        }
    }

    async createClassSelection(channel: Discord.GuildTextBasedChannel) {
        await channel.send({
            components: [await this.embeds.classSelectionHeader(RaidsClassData)],
            flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
        })
    }

    async updateClassSelectionDescription(interaction: Discord.StringSelectMenuInteraction) {
        let previousInteraction = this.classSelectionInteractions.get(interaction.user.id)
        let selection = this.classSelections.get(interaction.user.id)
        if (previousInteraction) {
            await previousInteraction.editReply({
                components: [await this.embeds.classSelectionDescription(RaidsClassData, selection)],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            await interaction.deferUpdate()
        } else {
            await interaction.reply({
                components: [await this.embeds.classSelectionDescription(RaidsClassData, selection)],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            this.classSelectionInteractions.set(interaction.user.id, interaction)
        }
    }

    async setUserClass(interaction: Discord.ButtonInteraction){
        if (!this.raid) {
            await interaction.reply({
                components: [this.bot.embeds.failure("No Active Raid.", "Please try again when a raid is occurring.")],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            return
        }

        let team = this.teams!.getMemberTeam(interaction.member)
        if (!team) {
            await interaction.reply({
                components: [this.bot.embeds.failure("No team detected.", "Please ensure you have joined a team and have the respective role.")],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            return
        }

        let previousInteraction = this.classSelectionInteractions.get(interaction.user.id)
        let selection = this.classSelections.get(interaction.user.id)
        // @ts-ignore
        let classData = RaidsClassData[selection]

        let resData = JSON.stringify({
            "token": process.env.API_TOKEN,
            "user_name": interaction.user.displayName,
            "user_id": interaction.user.id,
            "raid_id": this.raid.id,
            "class": Number(selection),
            "team_id": team.id,
            "isHero": false
        })

        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/user/update`, {
            method: "POST",
            body: resData,
            headers: {"Content-type": "application/json"}
        })
        if (!res.ok) {
            await interaction.reply({
                content: null,
                components: [this.bot.embeds.failure("Choice failed to save.", "Something went wrong, please try again or speak to Ramiris.")],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            this.log(res.status, res.statusText, await res.text())
            return
        }
        await this.raid.updateUserData(interaction.user.id)
        this.log(`${this.bot.chalk.magenta(interaction.member.displayName)} has confirmed they will be a ${this.bot.chalk.yellow(classData.name)}`)
        await interaction.reply({
            components: [this.bot.embeds.success("Class Selected", `You will be a ${classData.name}.`)],
            flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
        })
        await previousInteraction.editReply({
            components: [await this.embeds.classSelectionDescription(RaidsClassData, selection)],
            flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
        })
    }
}

export class RaidsSubModule extends DiscordBotSubModule {
    raidsModule: RaidsModule | undefined
    raidClasses: Discord.Collection<string, RaidsRaid> = new Discord.Collection()

    constructor(module: DiscordBotModuleType) {
        super(module, "raids")
    }

    async initialise() {
        this.raidsModule = await this.module.bot.requireModule("raids", RaidsModule)
        await super.initialise()
    }

    protected async registerFile(name: string, path: string, data: any) {
        await super.registerFile(name, path, data)
        this.raidClasses.set(name.replace(".js", ""), data)
        this.module.log(`${this.module.bot.chalk.blue("Raid")}: ${data.name}`)
    }
}