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
    subModules: Discord.Collection<string, DiscordBotSubModule> = new Discord.Collection()

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
        await new DiscordCommandSubModule(this).initialise()
    }

    async postInit () {
        this.log(`Initialised!`)
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

}

export class DiscordBotSubModule {
    module: DiscordBotModuleType
    path: string

    constructor(module: DiscordBotModuleType, path: string) {
        this.module = module
        this.path = path
    }

    async initialise() {
        const subModulePath = path.join(path.dirname(this.module.path), this.path)
        if (!fs.existsSync(subModulePath)) {
            this.module.log(this.module.bot.chalk.grey.italic(`SubModule path ${this.path} not found at ${subModulePath}.`))
            return
        }

        const fileNames = fs.readdirSync(subModulePath, { withFileTypes: true, recursive: true })
            .filter(dirent => !dirent.isDirectory())
            .filter((dirent) => {
                return !dirent.name.startsWith("_") && (dirent.name.endsWith(".js") || dirent.name.endsWith(".ts"))
            })
            .map(dirent => dirent.name)

        for (const fileName of fileNames) {
            let filePath = path.join("file://", subModulePath, fileName)
            let {default: file} = await import(filePath)
            try {
                await this.registerFile(filePath, file)
            } catch (e) {
                this.module.log(`Failed to register file at ${filePath} ${e}`)
                this.module.log(this.module.bot.chalk.redBright(e))
            }
        }
        this.module.subModules.set(this.path, this)
    }

    protected async registerFile(path: string, data: any) {

    }
}

export class DiscordCommandSubModule extends DiscordBotSubModule {
    constructor(module: DiscordBotModuleType) {
        super(module, "commands")
    }

    protected async registerFile(path: string, data: any): Promise<void> {
        await super.registerFile(path, data)
        for (const dataSource of ["data", "data2", "data3"]) {
            if (!data[dataSource]) {continue}
            const commandData = data[dataSource].toJSON()
            this.module.bot.commands.set(commandData.name, data)

            let type = ""
            let name = ""
            let desc = ""

            switch (commandData.type) {
                case Discord.ApplicationCommandType.ChatInput: // SLASH COMMANDS
                    type = this.module.bot.chalk.yellowBright("Slash Command")
                    name = commandData.name
                    desc = this.module.bot.chalk.grey("- " + commandData.description)
                    break
                case Discord.ApplicationCommandType.User: // USER CONTEXT MENU
                    type = this.module.bot.chalk.magenta("Context (User)")
                    name = commandData.name
                    break
                case Discord.ApplicationCommandType.Message: // MESSAGE CONTEXT MENU
                    type = this.module.bot.chalk.blue("Context (Message)")
                    name = commandData.name
                    break
            }
            this.module.log(`${type}: ${name} ${desc}`)
        }
    }
}