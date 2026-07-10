// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import RaidsModule, {RaidsSubModule} from "../module.js";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('raid')
        .setDescription('Manage Raids')
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
                .setName('start')
                .setDescription('[Admin] Start a raid')
                .addStringOption((option: Discord.SlashCommandStringOption) => option
                    .setName('path')
                    .setDescription('Classname of the raid to start. (Use /raid list)')
                    .setRequired(true)
                )
        )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('list')
            .setDescription('[Admin] List all the possible raids.')
        ),

    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        const subCommand = interaction.options.getSubcommand()
        switch (subCommand) {
            case 'start':
                await this.start(bot, interaction)
                break
            case 'list':
                await this.list(bot, interaction)
                break
        }
    },

    async start(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        let raidsMod = await bot.requireModule("raids", RaidsModule)
        let raidPath = interaction.options.getString("path")

        if (raidsMod.raid) {
            await interaction.reply({
                components: [bot.embeds.failure("Failed to create Raid", "Another raid is already running.")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        if (await raidsMod.createRaid(raidPath)) {
            await interaction.reply({
                components: [bot.embeds.success("Raid Created", `Started raid ${raidPath}`)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        } else {
            await interaction.reply({
                components: [bot.embeds.failure("Failed to create Raid", "Something went wrong.")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        }
    },

    async list(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        let raidsMod = await bot.requireModule("raids", RaidsModule)
        let raidsSubMod = raidsMod.subModules.get("raids") as RaidsSubModule
        await interaction.reply({
            components: [bot.embeds.generic(
                "Raids List",
                "",
                `- ${raidsSubMod.raidClasses.keys().toArray().join("\n- ")}`
            )],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })
    }
};