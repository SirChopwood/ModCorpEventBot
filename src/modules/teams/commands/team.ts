// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";

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
        )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('info')
            .setDescription('Get info about a team by name or ID')
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('name')
                .setDescription('Name of the team to search for.')
                .setRequired(false)
            )
            .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
                .setName('id')
                .setDescription('ID of the team to search for.')
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('edit')
            .setDescription('[Admin] Edit an existing team')
            .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
                .setName('id')
                .setDescription('ID of the team to edit.')
                .setRequired(true)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('name')
                .setDescription('Name of the team.')
                .setRequired(false)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('description')
                .setDescription('Description of the team.')
                .setRequired(false)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('colour')
                .setDescription('A colour for the team in the form of a Hex Code. e.g."#ffbb00"')
                .setRequired(false)
            )
            .addStringOption((option: Discord.SlashCommandStringOption) => option
                .setName('logo_url')
                .setDescription('A logo for the team in the form of a url link to an image.')
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('link')
            .setDescription('[Admin] Link the discord role, channel and server for the team. (Use command in target server)')
            .addIntegerOption((option: Discord.SlashCommandIntegerOption) => option
                .setName('id')
                .setDescription('ID of the team to edit.')
                .setRequired(true)
            )
            .addRoleOption((option: Discord.SlashCommandRoleOption) => option
                .setName('role')
                .setDescription('The role for members of the team.')
                .setRequired(true)
            )
            .addChannelOption((option: Discord.SlashCommandChannelOption) => option
                .setName('channel')
                .setDescription('The channel for team related messages to be posted. (This should be hidden from other teams!)')
                .setRequired(true)
            )
        )
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
            case 'edit':
                await this.edit(bot, interaction)
                break;
            case 'link':
                await this.link(bot, interaction)
                break;
            case 'assignment':
                await this.assignment(bot, interaction)
                break;
        }
    },

    async create(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.member)) {return}

        let embed = new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setTitle("Creating team...")
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})

        let newTeamData: Record<string, string> = {
            "token": process.env.API_TOKEN as string,
            "user_name": interaction.user.username,
            "user_id": interaction.user.id,
            "name": interaction.options.getString("name"),
            "description": interaction.options.getString("description"),
            "colour": interaction.options.getString("colour"),
            "logo_url": interaction.options.getString("logo_url")
        }

        let creationResponse = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/create", {
            method: "POST",
            body: JSON.stringify(newTeamData),
            headers: {"Content-type": "application/json"}
        })

        if (creationResponse.ok) {
            const newTeam = await creationResponse.json()
            embed = await bot.modules.get("teams").buildTeamEmbed(newTeam[0])
            await interaction.editReply({
                content: null,
                poll: null,
                embeds: null,
                stickers: null,
                components: [embed],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            });
            return
        } else {
            let resMessage = await creationResponse.text()
            embed.setTitle("Failed to create team.")
            embed.setDescription(resMessage)
            embed.setColor(Discord.Colors.Red)
            await interaction.editReply({embeds: [embed]});
            return
        }
    },

    async info(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        let targetName: string = interaction.options.getString('name')
        let targetId: number = interaction.options.getInteger("id")

        await interaction.reply({content: "Searching...", flags: Discord.MessageFlags.Ephemeral})

        let fetchResponse
        if (targetName) { // Search by Name
            fetchResponse = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/fetch", {
                method: "POST",
                body: JSON.stringify({"name": targetName}),
                headers: {"Content-type": "application/json"}
            })
        } else if (targetId) { // Search by ID
            fetchResponse = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/fetch", {
                method: "POST",
                body: JSON.stringify({"id": targetId}),
                headers: {"Content-type": "application/json"}
            })
        } else if (bot.permissions.isAdmin(interaction.user)) {
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
                        .setURL(team.logo_url)
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
        } else {
            await interaction.editReply({content: "Please use a team Name or ID."});
            return
        }

        if (fetchResponse!.ok) {
            const newTeam = await fetchResponse!.json()
            let embed = await bot.modules.get("teams").buildTeamEmbed(newTeam)
            await interaction.editReply({
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

    async edit(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.member)) {return}

        let embed = new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setTitle("Editing team...")
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})

        let changeMade = false
        let newTeamData: Record<string, string> = {
            "token": process.env.API_TOKEN as string,
            "user_name": interaction.user.username,
            "user_id": interaction.user.id,
            "id": interaction.options.getInteger("id")
        }
        if (interaction.options.getString("name")) {
            newTeamData.name = interaction.options.getString("name")
            changeMade = true
        }
        if (interaction.options.getString("description")) {
            newTeamData.description = interaction.options.getString("description")
            changeMade = true
        }
        if (interaction.options.getString("colour")) {
            newTeamData.colour = interaction.options.getString("colour")
            changeMade = true
        }
        if (interaction.options.getString("logo_url")) {
            newTeamData.logo_url = interaction.options.getString("logo_url")
            changeMade = true
        }
        if (!changeMade) {
            embed.setTitle("No details to change were given.")
            embed.setColor(Discord.Colors.Red)
            await interaction.editReply({embeds: [embed]});
            return
        }

        let editResponse = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/edit", {
            method: "POST",
            body: JSON.stringify(newTeamData),
            headers: {"Content-type": "application/json"}
        })

        if (editResponse.ok) {
            const newTeam = await editResponse.json()
            embed = await bot.modules.get("teams").buildTeamEmbed(newTeam[0])
            await interaction.editReply({
                content: null,
                poll: null,
                embeds: null,
                stickers: null,
                components: [embed],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            });
            return
        } else {
            let resMessage = await editResponse.text()
            embed.setTitle("Failed to edit team.")
            embed.setDescription(resMessage)
            embed.setColor(Discord.Colors.Red)
            await interaction.editReply({embeds: [embed]});
            return
        }
    },

    async link(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.member)) {return}

        let embed = new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setTitle("Linking team...")
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})

        let newTeamData: Record<string, any> = {
            "token": process.env.API_TOKEN as string,
            "user_name": interaction.user.username,
            "user_id": interaction.user.id,
            "id": interaction.options.getInteger("id"),
            "discord": {"role": null, "channel": null, "server":null}
        }
        if (interaction.options.getRole("role")) {
            newTeamData.discord.role = interaction.options.getRole("role").id
        }
        if (interaction.options.getChannel("channel")) {
            newTeamData.discord.channel = interaction.options.getChannel("channel").id
        }
        newTeamData.discord.server = interaction.guild.id

        let linkResponse = await fetch("https://louismayes.xyz/api/v1/modcorp/teams/edit", {
            method: "POST",
            body: JSON.stringify(newTeamData),
            headers: {"Content-type": "application/json"}
        })

        if (linkResponse.ok) {
            const newTeam = await linkResponse.json()
            embed = await bot.modules.get("teams").buildTeamEmbed(newTeam[0])
            await interaction.editReply({
                content: null,
                poll: null,
                embeds: null,
                stickers: null,
                components: [embed],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            });
            return
        } else {
            let resMessage = await linkResponse.text()
            embed.setTitle("Failed to link team.")
            embed.setDescription(resMessage)
            embed.setColor(Discord.Colors.Red)
            await interaction.editReply({embeds: [embed]});
            return
        }
    },

    async assignment(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.member)) {return}

        let embed = new Discord.EmbedBuilder()
            .setColor(Discord.Colors.Yellow)
            .setTitle("Creating signup board...")
        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})

        const assignmentMessage = new Discord.ContainerBuilder()
            .setAccentColor(Discord.resolveColor("#a63232"))
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# Welcome to Camp Neko!\n## We're so happy you decided to come back.\n\nBefore we begin, please just go ahead and sign our little waiver and you can head straight on in. Make sure to say hi to your new team.\n\nTeams are semi-randomly assigned regardless of previous years, we will not be making any changes so please try to get along. If you have any questions, please direct them towards your Team Leaders or the Camp Councillors.`)
                ])
                .setThumbnailAccessory((thumbnail: Discord.ThumbnailBuilder) => thumbnail
                    .setURL("https://cdn.discordapp.com/attachments/1395279350403960922/1395538181675290645/CampNeko.png?ex=687acfb6&is=68797e36&hm=13196c4861058aad02b8f21cfe6d06ebd443444f60e0f9e7dfac997f957a0e4d&")
                )
            )
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
            .addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`I, *(insert name here)*, Camper.\n\nHereby sign away any liability of ModCorp for my activities and wellbeing at Camp Neko.\nAny and all actions related to and including... Woodchipping, Gas Leaks and Acts of God are in no way the fault of ModCorp and any results of such events are entirely the responsibility of the the Camper.`)
            ])
            .addSectionComponents((section: Discord.SectionBuilder) => section
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`Signed:`)
                ])
                .setButtonAccessory((button: Discord.ButtonBuilder) => button
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId("team-assignment")
                    .setLabel("Sign Here!")
                )
            )
            .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)
            .addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`-# Press the button to get assigned to a team, semi-randomly.`)
            ])

        await interaction.channel.send({components: [assignmentMessage], flags: [Discord.MessageFlags.IsComponentsV2]})

        embed.setColor(Discord.Colors.Green)
        embed.setTitle("Team Assignment Board Created!")
        await interaction.editReply({embeds: [embed]})
    },
};