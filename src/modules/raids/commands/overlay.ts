// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import RaidsModule, {RaidsSubModule} from "../module.js";


export default {
    data: new Discord.SlashCommandBuilder()
        .setName('overlay')
        .setDescription('Manual Tweaks to the Overlay')
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('banner')
            .setDescription('[Admin] Set a Banner (dont use during a raid) for 10s unless specified otherwise.')
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('title')
                .setDescription('Main large text')
                .setRequired(true)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('subtitle')
                .setDescription('smaller body text')
                .setRequired(true)
            )
            .addBooleanOption((option: Discord.SlashCommandStringOption) => option
                .setName('permanent')
                .setDescription('Keep banner visible until manually removed.')
                .setRequired(false)
            )
        ),

    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        const subCommand = interaction.options.getSubcommand()
        switch (subCommand) {
            case 'banner':
                await this.banner(bot, interaction)
                break
        }
    },

    async banner(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        let raidsMod = await bot.requireModule("raids", RaidsModule)
        let title = interaction.options.getString("title")
        let subtitle = interaction.options.getString("subtitle")
        let permanent = interaction.options.getBoolean("permanent")

        if (raidsMod.raid) {
            await interaction.reply({
                components: [bot.embeds.failure("Failed to edit banner", "A raid is running, try again later.")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        let res = await fetch(`${process.env.API_HOST}/api/raids_v2/raid/overlay`, {
            method: "POST",
            body: JSON.stringify({
                token: process.env.API_TOKEN,
                bossBar: {
                    mode: "None",
                    percentages: {}
                },
                messages: {
                    title: title,
                    subtitle: subtitle
                },
                timer: {
                    mode: "None",
                }
            }),
            headers: {"Content-type": "application/json"}
        })

        if (res.ok) {
            if (!permanent) {
                setTimeout(async () => {
                    await fetch(`${process.env.API_HOST}/api/raids_v2/raid/overlay`, {
                        method: "POST",
                        body: JSON.stringify({
                            token: process.env.API_TOKEN,
                            bossBar: {
                                mode: "None",
                                percentages: {}
                            },
                            messages: {
                            },
                            timer: {
                                mode: "None",
                            }
                        }),
                        headers: {"Content-type": "application/json"}
                    })
                }, 10 * 1000)
            }
            await interaction.reply({
                components: [bot.embeds.success("Banner Edited", `Set Banner to\n\n# ${title}\n### ${subtitle}`)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        } else {
            await interaction.reply({
                components: [bot.embeds.failure("Failed to edit banner", "Something went wrong.")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
        }
    },
};