// @ts-ignore
import {Client} from "discord.js";
import DiscordBot from "./bot.js";
import * as fs from "node:fs";
import path from 'path';


export default class DiscordBotModule {
    name: string = "Untitled Module"
    path: string = ""
    desc: string = "No description set."
    bot: DiscordBot;
    client: Client

    constructor(bot: DiscordBot, path: string) {
        this.bot = bot;
        this.client = bot.client;
        this.path = path;
    }

    async initialise () {
        await this.registerCommands()
        this.log(`Initialised`)
    }
    async deinitialise () {
        this.log(`Deinitialised`)
    }

    log(...args: any[]) {
        console.log(`[${this.name}] -`, ...args);
    }

    async registerCommands () {
        const commandsPath = path.join(path.dirname(this.path), "commands")

        if (fs.existsSync(commandsPath)) {
            const foundCommands = fs.readdirSync(commandsPath, { withFileTypes: true, recursive: true })
                .filter(dirent => !dirent.isDirectory())
                .map(dirent => dirent.name)
            for (const command of foundCommands) {
                let {default: commandClass} = await import(path.join("file://", commandsPath, command))
                this.bot.commands.set(commandClass.data.toJSON().name, commandClass)

                this.log(`Command: ${commandClass.data.toJSON().name} - ${commandClass.data.toJSON().description}`)
            }
        } else {
            this.log(`No commands found.`)
        }
    }
}