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
    participants: Record<string, Discord.GuildMember> = {}
    bosses: Array<BossType> = [{
        intro: "From his padded cell deep in Tot's basement... the pained cries for help fall silent as the entity within awakens...",
        name: "Ramiris Aetherlight",
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
        this.resetScores()
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
        this.addTeam(team, sentMessage)
    }

    async onInteraction(interaction: Discord.Interaction, customId: string) {
    }

    async updateEvent(text: string) {
    }

    async finishEvent() {
    }
}