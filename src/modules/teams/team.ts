// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../bot"

export default class TeamClass {
    id: number
    name: string
    description: string
    colour: string
    logo_url: string
    score: number
    role: Discord.Role
    channel: Discord.TextChannel
    guild: Discord.Guild

    constructor(data: any) {
        this.id = data.id
        this.name = data.name
        this.description = data.description
        this.colour = data.colour
        this.logo_url = data.logo_url
        this.score = data.score
    }

    async fetchDiscordData(bot: DiscordBot, data: any) {
        this.guild = await bot.client.guilds.fetch(data.guild)
        this.channel = await this.guild.channels.fetch(data.channel)
        this.role = await this.guild.roles.fetch(data.role)
    }
}