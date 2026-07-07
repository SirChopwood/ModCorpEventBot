// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamClass from "../team.js";

export default {
    data: new Discord.SlashCommandBuilder()
        .setName('team')
        .setDescription('Interact with the teams.')
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('create')
            .setDescription('[Admin] Create a new team')
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('name')
                .setDescription('Name of the team to create.')
                .setRequired(true)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('description')
                .setDescription('Description of the team to create.')
                .setRequired(true)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('colour')
                .setDescription('A colour for the team in the form of a Hex Code. e.g."#ffbb00"')
                .setRequired(true)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('logo_url')
                .setDescription('A logo for the team in the form of a url link to an image.')
                .setRequired(true)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('icon_url')
                .setDescription('A smaller icon for the team in the form of a url link to an image.')
                .setRequired(true)
            )
            .addRoleOption((option: Discord.SlashCommandRoleOption) => option
                .setName('role')
                .setDescription('The Role that this team is represented by.')
                .setRequired(true))
            .addChannelOption((option: Discord.SlashCommandChannelOption) => option
                .setName('channel')
                .setDescription('The Channel that this team will view.')
                .setRequired(true))
        )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('info')
            .setDescription('Get info about a team by name or ID')
            .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
                .setName('id')
                .setDescription('ID of the team to search for.')
                .setRequired(false)
            )
        )
        // .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
        //     .setName('edit')
        //     .setDescription('[Admin] Edit an existing team')
        //     .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
        //         .setName('id')
        //         .setDescription('ID of the team to edit.')
        //         .setRequired(true)
        //     )
        //     .addStringOption((option: Discord.SlashCommandStringOption) => option
        //         .setName('name')
        //         .setDescription('Name of the team.')
        //         .setRequired(false)
        //     )
        //     .addStringOption((option: Discord.SlashCommandStringOption) => option
        //         .setName('description')
        //         .setDescription('Description of the team.')
        //         .setRequired(false)
        //     )
        //     .addStringOption((option: Discord.SlashCommandStringOption) => option
        //         .setName('colour')
        //         .setDescription('A colour for the team in the form of a Hex Code. e.g."#ffbb00"')
        //         .setRequired(false)
        //     )
        //     .addStringOption((option: Discord.SlashCommandStringOption) => option
        //         .setName('logo_url')
        //         .setDescription('A logo for the team in the form of a url link to an image.')
        //         .setRequired(false)
        //     )
        // )
        // .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
        //     .setName('link')
        //     .setDescription('[Admin] Link the discord role, channel and server for the team. (Use command in target server)')
        //     .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
        //         .setName('id')
        //         .setDescription('ID of the team to edit.')
        //         .setRequired(true)
        //     )
        //     .addRoleOption((option: Discord.SlashCommandRoleOption) => option
        //         .setName('role')
        //         .setDescription('The role for members of the team.')
        //         .setRequired(true)
        //     )
        //     .addChannelOption((option: Discord.SlashCommandChannelOption) => option
        //         .setName('channel')
        //         .setDescription('The channel for team related messages to be posted. (This should be hidden from other teams!)')
        //         .setRequired(true)
        //     )
        // )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('assignment')
            .setDescription('[Admin] Create a signup board for users to be assigned their teams.')
        ),

    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        const subCommand = interaction.options.getSubcommand()
        switch (subCommand) {
            case 'create':
                await this.create(bot, interaction)
                break;
            case 'info':
                await this.info(bot, interaction)
                break;
            // case 'edit':
            //     await this.edit(bot, interaction)
            //     break;
            // case 'link':
            //     await this.link(bot, interaction)
            //     break;
            case 'assignment':
                await this.assignment(bot, interaction)
                break;
        }
    },

    async create(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.member)) {
            await interaction.reply({
                components: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.reply({
            components: [bot.embeds.generic("Creating team...", "Please wait...")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })

        let newRole = interaction.options.getRole("role")
        let newChannel = interaction.options.getChannel("channel")

        let newTeamData: Record<string, string | object> = {
            "token": process.env.API_TOKEN as string,
            "user_name": interaction.user.username,
            "user_id": interaction.user.id,
            "name": interaction.options.getString("name"),
            "description": interaction.options.getString("description"),
            "colour": interaction.options.getString("colour"),
            "logo_url": interaction.options.getString("logo_url"),
            "icon_url": interaction.options.getString("icon_url"),
            "role": String(newRole.id),
            "channel": String(newChannel.id),
            "guild": String(interaction.guildId),
        }

        let creationResponse = await fetch(`${process.env.API_HOST}/api/teams_v2/team/create`, {
            method: "POST",
            body: JSON.stringify(newTeamData),
            headers: {"Content-type": "application/json"}
        })

        if (creationResponse.ok) {
            const newTeam = await creationResponse.json()
            let team = new TeamClass(newTeam[0])
            await team.fetchDiscordData(bot, newTeam[0])
            let embed = await bot.modules.get("teams").embeds.teamInfo(team)
            await interaction.editReply({
                components: [embed],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            });
            return
        } else {
            let resMessage = await creationResponse.text()
            await interaction.editReply({
                components: [bot.embeds.failure("Failed to create team", resMessage)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }
    },

    async info(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        let targetId: number = interaction.options.getInteger("id")

        if (!bot.permissions.isAdmin(interaction.member)) {
            await interaction.reply({
                components: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.reply({
            components: [bot.embeds.generic("Searching...")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })

        let fetchResponse
        if (targetId) { // Search by ID
            fetchResponse = await fetch(`${process.env.API_HOST}/api/teams_v2/team/fetch`, {
                method: "POST",
                body: JSON.stringify({"team_ids": [targetId]}),
                headers: {"Content-type": "application/json"}
            })
            if (fetchResponse.ok) {
                let data = await fetchResponse.json()
                let team = new TeamClass(data[0])
                await team.fetchDiscordData(bot, data[0])
                await interaction.editReply({
                    components: [await bot.modules.get("teams").embeds.teamInfo(team)],
                    flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                });
                return
            }
        } else {
            let message = new Discord.ContainerBuilder()
                .setAccentColor(Discord.Colors.Purple)
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# Teams Info`)
                ])
                .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)

            let leadingScoreTeam = null
            for (let team of bot.modules.get("teams").currentTeams.values()) {
                if (!leadingScoreTeam || team.score > leadingScoreTeam.score) {
                    leadingScoreTeam = team
                }
            }

            let ratios = await bot.modules.get("teams").getTeamRatios()
            for (let team of bot.modules.get("teams").currentTeams.values()) {
                let newSection = new Discord.SectionBuilder()
                    .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                        .setURL(team.icon_url)
                    )
                    .addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`## ${team.name}`)
                    ])
                // Display the ratios of team members
                const memberDifference = ratios.max - ratios.members[team.id]
                if (memberDifference > 0) {
                    newSection.addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`${Discord.inlineCode(memberDifference)} less member(s) than the largest, with a total of ${Discord.inlineCode(ratios.members[team.id])}.`)
                    ])
                } else {
                    newSection.addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`Total of ${Discord.inlineCode(ratios.members[team.id])} member(s).`)
                    ])
                }

                if (leadingScoreTeam.id === team.id) {
                    newSection.addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`\n__Team is in the lead__ with a score of ${Discord.inlineCode(team.score)}.`)
                    ])
                } else {
                    newSection.addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`\nScore: ${Discord.inlineCode(team.score)}`)
                    ])
                }

                message.addSectionComponents(newSection)
            }
            await interaction.editReply({
                content: null,
                components: [message],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            });
            return
        }

        if (fetchResponse!.ok) {
            const newTeam = await fetchResponse!.json()
            let embed = await bot.modules.get("teams").embeds.teamInfo(newTeam)
            await interaction.editReply({
                content: null,
                components: [embed],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            });
            return
        } else {
            console.log(await fetchResponse!.text())
            await interaction.editReply({content: "Failed to lookup team."});
            return
        }
    },

    // async edit(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
    //     if (!bot.permissions.isAdmin(interaction.member)) {return}
    //
    //     let embed = new Discord.EmbedBuilder()
    //         .setColor(Discord.Colors.Yellow)
    //         .setTitle("Editing team...")
    //     await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
    //
    //     let changeMade = false
    //     let newTeamData: Record<string, string> = {
    //         "token": process.env.API_TOKEN as string,
    //         "user_name": interaction.user.username,
    //         "user_id": interaction.user.id,
    //         "id": interaction.options.getInteger("id")
    //     }
    //     if (interaction.options.getString("name")) {
    //         newTeamData.name = interaction.options.getString("name")
    //         changeMade = true
    //     }
    //     if (interaction.options.getString("description")) {
    //         newTeamData.description = interaction.options.getString("description")
    //         changeMade = true
    //     }
    //     if (interaction.options.getString("colour")) {
    //         newTeamData.colour = interaction.options.getString("colour")
    //         changeMade = true
    //     }
    //     if (interaction.options.getString("logo_url")) {
    //         newTeamData.logo_url = interaction.options.getString("logo_url")
    //         changeMade = true
    //     }
    //     if (!changeMade) {
    //         embed.setTitle("No details to change were given.")
    //         embed.setColor(Discord.Colors.Red)
    //         await interaction.editReply({embeds: [embed]});
    //         return
    //     }
    //
    //     let editResponse = await fetch(`${process.env.API_HOST}/api/teams_v2/teams/edit`, {
    //         method: "POST",
    //         body: JSON.stringify(newTeamData),
    //         headers: {"Content-type": "application/json"}
    //     })
    //
    //     if (editResponse.ok) {
    //         const newTeam = await editResponse.json()
    //         embed = await bot.modules.get("teams").embeds.teamInfo(newTeam[0])
    //         await interaction.editReply({
    //             content: null,
    //             poll: null,
    //             embeds: null,
    //             stickers: null,
    //             components: [embed],
    //             flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
    //         });
    //         return
    //     } else {
    //         let resMessage = await editResponse.text()
    //         embed.setTitle("Failed to edit team.")
    //         embed.setDescription(resMessage)
    //         embed.setColor(Discord.Colors.Red)
    //         await interaction.editReply({embeds: [embed]});
    //         return
    //     }
    // },

    // async link(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
    //     if (!bot.permissions.isAdmin(interaction.member)) {return}
    //
    //     let embed = new Discord.EmbedBuilder()
    //         .setColor(Discord.Colors.Yellow)
    //         .setTitle("Linking team...")
    //     await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
    //
    //     let newTeamData: Record<string, any> = {
    //         "token": process.env.API_TOKEN as string,
    //         "user_name": interaction.user.username,
    //         "user_id": interaction.user.id,
    //         "id": interaction.options.getInteger("id"),
    //         "discord": {"role": null, "channel": null, "server":null}
    //     }
    //     if (interaction.options.getRole("role")) {
    //         newTeamData.discord.role = interaction.options.getRole("role").id
    //     }
    //     if (interaction.options.getChannel("channel")) {
    //         newTeamData.discord.channel = interaction.options.getChannel("channel").id
    //     }
    //     newTeamData.discord.server = interaction.guild.id
    //
    //     let linkResponse = await fetch(`${process.env.API_HOST}/api/v1/modcorp/teams/edit`, {
    //         method: "POST",
    //         body: JSON.stringify(newTeamData),
    //         headers: {"Content-type": "application/json"}
    //     })
    //
    //     if (linkResponse.ok) {
    //         const newTeam = await linkResponse.json()
    //         embed = await bot.modules.get("teams").embeds.teamInfo(newTeam[0])
    //         await interaction.editReply({
    //             content: null,
    //             poll: null,
    //             embeds: null,
    //             stickers: null,
    //             components: [embed],
    //             flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
    //         });
    //         return
    //     } else {
    //         let resMessage = await linkResponse.text()
    //         embed.setTitle("Failed to link team.")
    //         embed.setDescription(resMessage)
    //         embed.setColor(Discord.Colors.Red)
    //         await interaction.editReply({embeds: [embed]});
    //         return
    //     }
    // },

    async assignment(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.user)) {
            await interaction.reply({
                components: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.reply({
            components: [bot.embeds.generic("Creating signup board...")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })

        await interaction.followUp({
            components: [bot.modules.get("teams").embeds.signupBoard()],
            flags: [Discord.MessageFlags.IsComponentsV2]
        })

        await interaction.editReply({
            components: [bot.embeds.success("Team Assignment Board Created!")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })
    },
};