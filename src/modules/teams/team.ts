import {Team} from "./teams";
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
    server: Discord.Guild

    constructor(data: Team) {
        this.id = data.id
        this.name = data.name
        this.description = data.description
        this.colour = data.colour
        this.logo_url = data.logo_url
        this.score = data.score
    }

    async fetchDiscordData(bot: DiscordBot, data: Team) {
        this.server = await bot.client.guilds.fetch(data.discord.server)
        this.channel = await this.server.channels.fetch(data.discord.channel)
        this.role = await this.server.roles.fetch(data.discord.role)
    }
}