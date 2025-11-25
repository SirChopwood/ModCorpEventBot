// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import TeamsEvent from "../event.js";
import {Team} from "../teams.js";
import {DiscordBotModuleType} from "../../../module";

type BossType = {
    intro: string,
    name: string,
    title: string,
    image: string,
    victory: string,
    defeat: string
}

export default class TriviaQuestion extends TeamsEvent {
    participants: Discord.Collection<Discord.Snowflake, {
        team: number,
        role: string,
        message: Discord.Snowflake
    }> = new Discord.Collection();
    bosses: Array<BossType> = [{
        intro: "From his padded cell deep in Tot's basement... the pained cries for help fall silent as the entity within awakens...",
        name: "Ramiris Aether",
        title: "Event Manager",
        image: "https://cdn.discordapp.com/attachments/1393253098717446224/1439765406943543390/RamiValEyes_RightWallpaper.png",
        victory: "As the snow piles up, Ramiris' onslaught comes to an end. Bugs run rampant as his ToDo list fills up with tasks for another day. Team {name} standing proud as the cell locks shut once again.",
        defeat: "Despite their best efforts, Team {name} are no match for his sarcastic tone. Ramiris conquers another land as the snow settles on the battlefield, leaving his enemies to lick their wounds and retreat."
    }]
    currentBoss: BossType

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
    }

    async triggerEvent(team: Team) {
        await super.triggerEvent(team)
        let message = this.getMessageHeader(team)

        message.addMediaGalleryComponents([
            (mediaGallery: Discord.MediaGalleryBuilder) => mediaGallery.addItems([
                (mediaItem: Discord.MediaGalleryItemBuilder) =>
                    mediaItem.setURL(this.currentBoss.image)
            ])
        ])

        message.addTextDisplayComponents([
            (textDisplay: Discord.TextDisplayBuilder) => textDisplay
                .setContent(`*${this.currentBoss.intro}*\n# ${this.currentBoss.name}\n## ${this.currentBoss.title}`)
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
                if (interaction.member.roles.cache.has(team.discord.role)) {
                    embed.setColor(Discord.resolveColor(team.colour))
                    embed.setDescription(actionText)
                    let response = await interaction.reply({embeds: [embed], withResponse: true })
                    console.log(response.resource.message, response.resource.message.id)
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
        for (const team of Object.values(this.teams)) {
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
        }
    }

    async finishEvent() {
        for (const team of Object.values(this.teams)) {
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

            let resultMessage = new Discord.ContainerBuilder()
                .setAccentColor(Discord.resolveColor(team.colour))
                .addTextDisplayComponents([
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(`# Victory!`),
                    (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                        .setContent(this.currentBoss.victory)
                ])
                .addSeparatorComponents((separator: Discord.SeparatorBuilder) => separator)

                let userList = ""

            for (let userId of this.participants.keys()) {
                if (this.participants.get(userId)?.team === team.id) {
                    let user = await channel.guild.members.fetch(userId)
                    userList += `- ${user.displayName}\n`
                }
            }

            resultMessage.addTextDisplayComponents([
                (textDisplay: Discord.TextDisplayBuilder)=> textDisplay
                    .setContent(`## Combatants \n ${userList}`)
            ])
            let sentMessage = await channel.send({
                components: [resultMessage],
                flags: [Discord.MessageFlags.IsComponentsV2]
            })
        }
    }
}