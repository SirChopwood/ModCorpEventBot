// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamClass from "../team.js";
import TeamsModule from "../module";

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
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('assign')
            .setDescription('[Admin] Add a user to a team role')
            .addUserOption((option: Discord.SlashCommandUserOption) => option
                .setName('target')
                .setDescription('Target User.')
                .setRequired(true)
            )
            .addRoleOption((option: Discord.SlashCommandRoleOption) => option
                .setName('role')
                .setDescription('The role of the team they should join.')
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand: Discord.SlashCommandBuilder) => subcommand
            .setName('signup')
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
            case 'assign':
                await this.assign(bot, interaction)
                break;
            case 'signup':
                await this.signup(bot, interaction)
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
        let teams = bot.modules.get("teams") as TeamsModule

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
                    components: [await teams.embeds.teamInfo(team)],
                    flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
                });
                return
            }
        } else {
            let message: Array<Discord.ContainerBuilder> = [
                new Discord.ContainerBuilder()
                    .setAccentColor(Discord.Colors.Purple)
                    .addTextDisplayComponents([
                        (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                            .setContent(`# Teams Info`)
                    ])
            ]

            let leadingScoreTeam = null
            for (let team of teams.currentTeams.values()) {
                if (!leadingScoreTeam || team.score > leadingScoreTeam.score) {
                    leadingScoreTeam = team
                }
            }

            let ratios = await teams.getTeamRatios()
            for (let team of teams.currentTeams.values()) {
                let text = ""
                const memberDifference = ratios.max - ratios.members[team.id]
                if (memberDifference > 0) {
                    text += `${Discord.inlineCode(memberDifference)} less member(s) than the largest, with a total of ${Discord.inlineCode(ratios.members[team.id])}.`
                } else {
                    text += `Total of ${Discord.inlineCode(ratios.members[team.id])} member(s).`
                }

                if (leadingScoreTeam.id === team.id) {
                    text += `\n__Team is in the lead__ with a score of ${Discord.inlineCode(team.score)}.`
                } else {
                    text += `\nScore: ${Discord.inlineCode(team.score)}`
                }

                message.push(teams.embeds.teamTitle(team, text))
            }
            await interaction.editReply({
                components: message,
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            return
        }

        if (fetchResponse!.ok) {
            const newTeam = await fetchResponse!.json()
            let embed = await teams.embeds.teamInfo(newTeam)
            await interaction.editReply({
                components: [embed],
                flags: [Discord.MessageFlags.IsComponentsV2, Discord.MessageFlags.Ephemeral]
            })
            return
        } else {
            console.log(await fetchResponse!.text())
            await interaction.editReply({content: "Failed to lookup team."});
            return
        }
    },

    async signup(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
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

    async assign(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction){
        if (!bot.permissions.isAdmin(interaction.user)) {
            await interaction.reply({
                components: [bot.embeds.failure("Access Denied", "You do not have permission for this!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.reply({
            components: [bot.embeds.generic("Working...")],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })

        let target = interaction.options.getMember("target") as Discord.GuildMember | null
        let role = interaction.options.getRole("role") as Discord.Role | null
        let teams = bot.modules.get("teams") as TeamsModule
        if (!target || !role) {
            await interaction.editReply({
                components: [bot.embeds.failure("Assignment failed.", "Role or User could not be found!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        let team
        for (let t of teams.currentTeams.values()) {
            if (t.role.id === role.id) {
                team = t
                break
            }
        }
        if (!team) {
            await interaction.editReply({
                components: [bot.embeds.failure("Assignment failed.", `Unable to find team with the role ${role.name}!`)],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        try {
            await target.roles.add(role)
        } catch (e) {
            await interaction.editReply({
                components: [bot.embeds.failure("Assignment failed.", "Unable to assign role to user!")],
                flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        await interaction.editReply({
            components: [bot.embeds.success("Success!", `${target.displayName} has been assigned to [${team.id}] Team ${team.name}`)],
            flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2]
        })
    },
};