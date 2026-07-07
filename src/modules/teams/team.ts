// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../bot"

export default class TeamClass {
    id: number
    name: string
    description: string
    colour: string
    logo_url: string
    icon_url: string
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
        this.icon_url = data.icon_url
        this.score = data.score
    }

    async fetchDiscordData(bot: DiscordBot, data: any) {
        this.guild = await bot.client.guilds.fetch(data.guild)
        if (!this.guild) {
            console.log(`Failed to find guild. Searched: ${data.guild} | Found: ${this.guild}`)
            return
        }
        this.channel = await this.guild.channels.fetch(data.channel)
        if (!this.channel) {
            console.log(`Failed to find channel. Searched: ${data.channel} | Found: ${this.channel}`)
            return
        }
        this.role = await this.guild.roles.fetch(data.role)
        if (!this.role) {
            console.log(`Failed to find role. Searched: ${data.role} | Found: ${this.role}`)
            return
        }
    }
}