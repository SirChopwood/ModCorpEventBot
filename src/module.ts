// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "./bot.js";
import * as fs from "node:fs";
import path from 'path';

export interface DiscordBotModuleType extends DiscordBotModule {
    [index: string]: any
}

export default class DiscordBotModule {
    bot: DiscordBot;
    client: Discord.Client
    path: string = ""
    name: string
    desc: string
    colour: string
    commandName: string

    constructor(bot: DiscordBot, path: string, {
        name = "Untitled Module",
        desc = "No description set.",
        colour = "white"
    }) {
        this.bot = bot
        this.client = bot.client
        this.name = name
        this.desc = desc
        this.colour = colour
        this.path = path
        this.commandName = this.name.toLowerCase().replace(" ", "")
        this.log("Loaded!")
    }

    async preInit () {
        this.log(`Initialising...`)
    }

    async initialise () {
        await this.registerCommands()
    }

    async postInit () {
        this.log(`Initialised!\n`)
    }
    async deinitialise () {
        this.log(`Deinitialised!`)
    }

    async onInteraction (interaction: Discord.Interaction, customId: string) {
    }

    log(...args: any[]) {
        // @ts-ignore
        this.bot.log([this.bot.chalk[this.colour].bold(this.name)], ...args);
    }

    subLog(source: Array<string>, ...args: any[]) {
        source.push(this.bot.chalk[this.colour].bold(this.name))
        this.bot.log(source, ...args);
    }

    async registerCommands () {
        const commandsPath = path.join(path.dirname(this.path), "commands")

        if (fs.existsSync(commandsPath)) {
            const foundCommands = fs.readdirSync(commandsPath, { withFileTypes: true, recursive: true })
                .filter(dirent => !dirent.isDirectory())
                .filter((dirent) => {
                    return !dirent.name.startsWith("_")
                })
                .map(dirent => dirent.name)
            for (const command of foundCommands) {
                let {default: commandClass} = await import(path.join("file://", commandsPath, command))
                for (const dataSource of ["data", "data2", "data3"]) {
                    if (!commandClass[dataSource]) {continue}
                    const commandData = commandClass[dataSource].toJSON()
                    this.bot.commands.set(commandData.name, commandClass)

                    let type = ""
                    let name = ""
                    let desc = ""

                    switch (commandData.type) {
                        case Discord.ApplicationCommandType.ChatInput: // SLASH COMMANDS
                            type = this.bot.chalk.yellowBright("Slash Command")
                            name = commandData.name
                            desc = this.bot.chalk.grey("- " + commandData.description)
                            break
                        case Discord.ApplicationCommandType.User: // USER CONTEXT MENU
                            type = this.bot.chalk.magenta("Context (User)")
                            name = commandData.name
                            break
                        case Discord.ApplicationCommandType.Message: // MESSAGE CONTEXT MENU
                            type = this.bot.chalk.blue("Context (Message)")
                            name = commandData.name
                            break
                    }
                    this.log(`${type}: ${name} ${desc}`)
                }
            }
        } else {
            this.log(`No commands found.`)
        }
    }
}