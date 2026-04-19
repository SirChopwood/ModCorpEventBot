// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
import {DiscordBotModuleType} from "../../../module";
import bosses, {BossType} from "../bosses.js";
import TeamClass from "../team";

export default class TriviaQuestion extends TeamsEvent {
    participants: Discord.Collection<Discord.Snowflake, {
        team: number,
        role: string,
        message: Discord.Snowflake
    }> = new Discord.Collection();
    bosses: Array<BossType> = bosses
    currentBoss: BossType
    roll = 0

    constructor(bot: DiscordBot, module: DiscordBotModuleType) {
        super(bot, module, {
            name: "Snowball Boss Fight",
            desc: "A christmas themed !boss fight.",
            instructions: "Defeat the boss to earn points. \nGather snow, throw the snowballs or help protect your teammates. \nThe more balanced your team the better the odds, or perhaps try a specific strategy."
        })
        this.currentBoss = this.bosses[0]
    }

    async prepareEvent() {
        await super.prepareEvent()
        this.participants.clear()
        this.currentBoss = this.bosses[Math.floor(Math.random() * this.bosses.length)]
        this.log(`Summoning Boss ${this.bot.chalk.redBright(this.currentBoss.titleCard.name)} with difficulty: ${this.bot.chalk.blue(this.currentBoss.difficulty)}`)
    }

    async debugTrigger() {
        for (const boss of this.bosses) {
            for (const team of this.module.currentTeams.values()) {
                this.currentBoss = boss
                this.log(`[DEBUG] Summoning Boss ${this.bot.chalk.redBright(this.currentBoss.titleCard.name)} with difficulty: ${this.bot.chalk.blue(this.currentBoss.difficulty)}`)
                await this.triggerEvent(team)
            }
        }
    }

    async triggerEvent(team: TeamClass) {
        await super.triggerEvent(team)
        let message = await this.getMessageHeader(team)

        message.addMediaGalleryComponents([
            (mediaGallery: Discord.MediaGalleryBuilder) => mediaGallery.addItems([
                (mediaItem: Discord.MediaGalleryItemBuilder) =>
                    mediaItem.setURL(this.currentBoss.titleCard.image)
            ])
        ])

        message.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`*${this.currentBoss.titleCard.intro}*\n# ${this.currentBoss.titleCard.name}\n## ${this.currentBoss.titleCard.title}`)
        ])

        message.addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)

        message.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`Actions:`)
        ])

        message.addActionRowComponents((actionRow: Discord.ActionRowBuilder) =>
            actionRow.setComponents(
                new Discord.ButtonBuilder()
                    .setLabel("Gather Snow")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-${this.commandName}-gather`),
                new Discord.ButtonBuilder()
                    .setLabel("Throw Snowballs")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-${this.commandName}-throw`),
                new Discord.ButtonBuilder()
                    .setLabel("Shield Others")
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setCustomId(`${this.module.commandName}-events-${this.commandName}-shield`)
            )
        )

        // Send Message
        let sentMessage = await this.teamRefs[team.id].channel.send({
            components: [message],
            flags: [Discord.MessageFlags.IsComponentsV2]
        })
        this.teamRefs[team.id].messages["Main"] = sentMessage.id
        this.teamRefs[team.id].components[sentMessage.id] = [message]
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
        if (!interaction.isButton()) {return}
        if (customId.endsWith("gather")) {
            await this.addUserToFight(interaction,
                "gather",
                `*${Discord.userMention(interaction.user.id)} runs about gathering snow into snowballs.*`
            )
        } else if (customId.endsWith("throw")) {
            await this.addUserToFight(interaction,
                "throw",
                `*${Discord.userMention(interaction.user.id)} steps up to lob snowballs at the enemy.*`
            )
        } else if (customId.endsWith("shield")) {
            await this.addUserToFight(interaction,
                "shield",
                `*${Discord.userMention(interaction.user.id)} charges forward to protect the others.*`
            )
        }
    }

    async addUserToFight(interaction: Discord.Interaction, role: string, actionText: string) {

        if (this.participants.has(interaction.user.id)) {
            let part = this.participants.get(interaction.user.id)
            let oldMessage = await interaction.channel.messages.fetch(part.message)
            if (oldMessage) {
                let oldEmbed = oldMessage.embeds[0]
                let newEmbed = new Discord.EmbedBuilder()
                newEmbed.setColor(oldEmbed.color)
                newEmbed.setDescription(actionText)
                let response = await interaction.reply({embeds: [newEmbed], withResponse: true })
                await oldMessage.delete()
                this.participants.set(interaction.user.id, {
                    team: part.team,
                    role: role,
                    message: response.resource.message.id
                })
            }
            return
        } else {
            let embed = new Discord.EmbedBuilder()
            for (const team of Object.values(this.teams)) {
                if (interaction.member.roles.cache.has(team.role.id)) {
                    embed.setColor(Discord.resolveColor(team.colour))
                    embed.setDescription(actionText)
                    let response = await interaction.reply({embeds: [embed], withResponse: true})
                    this.participants.set(interaction.user.id, {
                        team: team.id,
                        role: role,
                        message: response.resource.message.id
                    })
                    return
                }
            }
            embed.setColor(Discord.Colors.Red)
            embed.setTitle("You are not in a team!")
            embed.setDescription("Please join a team before trying to join in.")
            await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral})
        }
    }

    async updateEvent(text: string) {
        await super.updateEvent(text)
        for (const team of Object.values(this.teams)) {
            try {
                let {channel, message, components} = await this.getTeamMessageAndComponent(team)
                let newComps: Discord.ContainerBuilder = components[0]

                if (newComps.components[7]) {
                    newComps.spliceComponents(7, 1)
                }

                newComps.addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                        .setContent(text)
                ])
                await message.edit({components: [newComps]})
            } catch (e) {
                this.log(`Failed to update event for team ${team.name}`)
            }
        }
    }

    async finishEvent() {
        this.roll = Math.round(Math.random()*100)
        for (const team of Object.values(this.teams)) {
            try {
                await this.finishTeam(team)
            } catch (e) {
                this.log(`Failed to finish event for team ${team.name}`)
                this.log(e)
            }
        }
    }

    async finishTeam(team: TeamClass) {
        let {channel, message, components} = await this.getTeamMessageAndComponent(team)
        let newComps: Discord.ContainerBuilder = components[0]
        if (newComps.components[7]) {
            newComps.spliceComponents(7, 1)
        }

        newComps.components[6].components[0].setDisabled(true)
        newComps.components[6].components[1].setDisabled(true)
        newComps.components[6].components[2].setDisabled(true)

        newComps.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent("The battle has ended...")
        ])
        await message.edit({components: [newComps]})

        // Add logic for calculating winner here
        let ratios: Discord.Collection = new Discord.Collection()
        ratios.set("gather", 0)
        ratios.set("throw", 0)
        ratios.set("shield", 0)
        let roleGap = 0
        let playerCount = 0
        for (const entry of this.participants.values()) {
            if (entry.team === team.id) {
                ratios.set(entry.role, ratios.get(entry.role) + 1)
                playerCount += 1
            }
        }

        if (playerCount === 0) {
            let resultMessage = await this.startResultMessage(team, `# Defeat!\n${this.currentBoss.results.uncontested.replaceAll("{name}", team.name)}`)
            let sentMessage = await channel.send({
                components: [resultMessage],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
            return
        }

        let sortedRatios = ratios.values().toArray().sort(function(a: number, b: number){return a - b})
        roleGap = Math.abs(sortedRatios[0] - sortedRatios[sortedRatios.length - 1])

        let resultText = "Defeat"
        let resultDesc = this.currentBoss.results.defeat.replaceAll("{name}", team.name)

        if (ratios.get("gather") === 0 && ratios.get("gather") === 0) {
            resultDesc = this.currentBoss.results.allShield.replaceAll("{name}", team.name)
            this.log(`All players went with Shield => Defeat`)
        } else if (ratios.get("shield") === 0 && ratios.get("throw") === 0) {
            resultDesc = this.currentBoss.results.allGather.replaceAll("{name}", team.name)
            this.log(`All players went with Gather => Defeat`)
        } else if (ratios.get("shield") === 0 && ratios.get("gather") === 0) {
            resultDesc = this.currentBoss.results.allThrow.replaceAll("{name}", team.name)
            this.log(`All players went with Throw => Defeat`)
        } else {
            let playerMod = Math.min((Math.max(playerCount - 6, 0)) * 2, 15)
            let roleMod = Math.min(roleGap * -3, 12)
            let modifier = Math.max(Math.min((playerMod + roleMod) * 2, 30), 0)

            if (this.roll + modifier >= this.currentBoss.difficulty) {
                resultText = "Victory"
                resultDesc = this.currentBoss.results.victory.replaceAll("{name}", team.name)
                let score = 3 * playerCount

                let scoreResponse = await fetch(`${process.env.API_HOST}/api/v1/modcorp/teams/score`, {
                    method: "POST",
                    body: JSON.stringify({
                        "token": process.env.API_TOKEN as string,
                        "user_name": team.name,
                        "user_id": team.role.id,
                        "id": team.id,
                        "score": score,
                        "reason": `Team ${team.name} completed the event ${this.name}`
                    }),
                    headers: {"Content-type": "application/json"}
                })

                if (!scoreResponse.ok) {
                    this.log(`Failed to update score for Team ${team.name} by ${score}`)
                }
            }

            this.log(`Team ${this.bot.chalk.green(team.name)} | Player Count: ${this.bot.chalk.blue(playerCount)} + Role Gap: ${this.bot.chalk.blue(roleGap)} => Modifier ${this.bot.chalk.blue(modifier)}`)
            this.log(`Team ${this.bot.chalk.green(team.name)} | Roll: ${this.bot.chalk.yellow(this.roll)}(+${this.bot.chalk.blue(modifier)}) VS ${this.bot.chalk.redBright(this.currentBoss.difficulty)} => ${resultText}`)


        }

        let resultMessage = await this.startResultMessage(team, `# ${resultText}!\n${resultDesc}`)

        let userList = ""

        for (let userId of this.participants.keys()) {
            if (this.participants.get(userId)?.team === team.id) {
                let user = await channel.guild.members.fetch(userId)
                userList += `- ${user.displayName} (${this.participants.get(userId)!.role})\n`
            }
        }

        resultMessage.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                .setContent(`## Combatants \n ${userList}`)
        ])

        resultMessage = await this.finishResultMessage(team, resultMessage)
        await channel.send({
            components: [resultMessage],
            flags: [Discord.MessageFlags.IsComponentsV2]
        })
    }
}