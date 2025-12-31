// @ts-ignore
import * as Discord from "discord.js";
// @ts-ignore
import chalk, {ChalkInstance} from 'chalk';
import * as fs from "node:fs";
import path from 'path';
import { fileURLToPath } from 'url';
import Permissions from "./permissions.js";
import DiscordBotModule from "./module";
import * as util from "node:util";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, "../", "logs")
const logPath = path.join(logDir, `${new Date().toISOString().replaceAll(":","-")}.txt`)

export default class DiscordBot{
    commands: Discord.Collection<string, {data: any, execute: void}>
    modules: Discord.Collection<string, DiscordBotModule>
    client: Discord.Client;
    permissions: Permissions
    chalk: ChalkInstance
    cooldowns = new Discord.Collection()
    logfile: fs.WriteStream

        constructor() {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir)
        }
        this.logfile = fs.createWriteStream(logPath, {flags: 'w'})

        this.client = new Discord.Client({
            intents: [
                Discord.GatewayIntentBits.Guilds,
                Discord.GatewayIntentBits.GuildMessages,
                Discord.GatewayIntentBits.GuildMembers,
                Discord.GatewayIntentBits.MessageContent,
                Discord.GatewayIntentBits.DirectMessages
            ],
            partials: [
                Discord.Partials.Channel
            ]
        })
        this.commands = new Discord.Collection()
        this.modules = new Discord.Collection()
        this.permissions = new Permissions()
        this.chalk = chalk

        this.client.once(Discord.Events.ClientReady, (readyClient: Discord.Client) => this.onLogin(readyClient))
        this.client.on(Discord.Events.InteractionCreate, (interaction: Discord.Interaction) => this.onInteraction(interaction))
        this.client.on(Discord.Events.GuildCreate, (guild: Discord.Guild) => this.onJoinGuild(guild))
    }

    log(source: Array<string>, ...args: any[]) {
        source.reverse()
        const date = this.chalk.grey(new Date().toLocaleString("EN-GB", {timeStyle: "medium"}))
        let sources = `[${source.join("/")}]`
        const sourcesLength = util.stripVTControlCharacters(sources).length
        const sourcesPadding = " ".repeat(Math.max(0, 30-sourcesLength))
        this.logfile.write(util.format(date, sourcesPadding, sources, ...args).replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "") + "\n")
        console.log(date, sourcesPadding, sources, ...args)
    }
    
    botLog(...args: any[]) {
        this.log([this.chalk.green.bold("Bot Client")], ...args)
    }
    
    async mountAllModules(desiredModules: Array<string> = JSON.parse(process.env.BOT_MODULES!)){
        const allModules = fs.readdirSync(path.join(__dirname, "./modules"), { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
        this.botLog(`${this.chalk.blue(allModules.length)} Modules found in files.`)

        
        this.botLog(this.chalk.bold.underline("Loading Desired Modules..."))
        for (const desiredModule of desiredModules) {
            if (allModules.includes(desiredModule.toLowerCase())) {
                const modulePath = path.join(
                    __dirname,
                    "./modules",
                    desiredModule.toLowerCase(),
                    "module.js"
                )
                let {default: moduleClass} = await import(path.join("file://", modulePath))
                let module = new moduleClass(this, modulePath)
                this.modules.set(module.commandName, module)
            }
        }
        this.botLog(this.chalk.bold.underline.green("Done!\n"))
        
        
        this.botLog(this.chalk.bold.underline("Initialising Modules..."))
        for (let key of this.modules.keys()) {
            await this.modules.get(key).preInit()
            await this.modules.get(key).initialise()
            await this.modules.get(key).postInit()
        }
        this.botLog(this.chalk.bold.underline.green("Done!\n"))
        
        
        this.botLog(this.chalk.bold.underline("Compiling Commands..."))
        let newCommands: Array<Discord.Command> = []
        for (let command of this.commands.keys()) {
            let data = this.commands.get(command)
            for (const dataSource of ["data", "data2", "data3"]) {
                if (!data[dataSource]) {
                    continue
                }
                let value = data[dataSource].toJSON()
                if (value.name === command) {
                    newCommands.push(value)
                }
            }
        }
        this.botLog(`Total Commands: ${this.chalk.blueBright(newCommands.length)}\n`)
        this.botLog(this.chalk.bold.underline.green("Done!\n"))
        
        
        this.botLog(this.chalk.bold.underline("Applying to Guilds..."))
        for (let guildId of this.client.guilds.cache.keys()) {
            await this.client.application.commands.set(newCommands, guildId);
            this.botLog(`${this.chalk.magenta(this.client.guilds.cache.get(guildId)?.name)} ${this.chalk.grey("- " + guildId)}`)
        }
        this.botLog(this.chalk.bold.underline.green("Done!\n"))
    }

    async unmountModules() {
        this.botLog("Deinitialising Modules:")
        for (let moduleName of this.modules.keys()) {
            await this.modules.get(moduleName).deinitialise()
            this.modules.delete(moduleName)
        }
        this.botLog("Done!")
    }

    async shutdown() {
        this.botLog("Shutting Down...")
        await this.unmountModules()
        this.botLog("Goodbye!")
        process.exit()
    }

    async onInteraction(interaction: Discord.Interaction) {
        if (!interaction.isAutocomplete()) {
            if (this.cooldowns.has(interaction.user.id)) {
                let previous = this.cooldowns.get(interaction.user.id)
                let current = Date.now() - (Number(process.env.BOT_COOLDOWN) || 5000)
                if (previous > current) {
                    this.botLog(this.chalk.grey(`${this.chalk.italic(interaction.user.displayName)} triggered their cooldown.`))
                    if (interaction.isRepliable()) {
                        let embed = new Discord.EmbedBuilder()
                            .setColor(Discord.Colors.Red)
                            .setTitle("Please wait before trying again!")
                            .setDescription("-# Spamming will not make it happen quicker.")
                        await interaction.reply({embeds: [embed], flags: Discord.MessageFlags.Ephemeral});
                    }
                    return
                }
            }
            this.cooldowns.set(interaction.user.id, Date.now())
        }

        if (interaction.isCommand() || interaction.isAutocomplete()) { // Sends Application Commands to be executed directly
            await this.onApplicationCommand(interaction)
        } else if (interaction.customId) { // Forwards buttons, selects etc to relevant module
            await this.onComponentInteraction(interaction)
        }
    }

    async onComponentInteraction(interaction: Discord.Interaction) {
        const interactionModuleName = interaction.customId.split("-")[0]
        const interactionCustomId = interaction.customId.replace(`${interactionModuleName}-`, "")
        const interactionModule = this.modules.get(interactionModuleName)
        try {
            interactionModule?.log(this.chalk.grey(`${this.chalk.italic(interaction.user.displayName)} triggered interaction ${interactionCustomId}`))
            await interactionModule.onInteraction(interaction, interactionCustomId)
        } catch (error) {
        this.botLog(`Error executing ${interaction.customId}`)
        this.botLog(error)
        }
    }

    async onApplicationCommand(interaction: Discord.ChatInputCommandInteraction | Discord.AutocompleteInteraction) {
        const command = this.commands.get(interaction.commandName)


        const commandData = command.data.toJSON()
        let type = ""
        let name = ""
        let desc = ""

        switch (commandData.type) {
            case Discord.ApplicationCommandType.ChatInput: // SLASH COMMANDS
                type = this.chalk.yellowBright("Slash Command")
                name = commandData.name
                desc = this.chalk.grey("- " + commandData.description)
                break
            case Discord.ApplicationCommandType.User: // USER CONTEXT MENU
                type = this.chalk.magenta("Context (User)")
                name = commandData.name
                break
            case Discord.ApplicationCommandType.Message: // MESSAGE CONTEXT MENU
                type = this.chalk.blue("Context (Message)")
                name = commandData.name
                break
        }

        if (interaction.isCommand()) {
            this.log([this.chalk.green.bold("Bot Client")+"/"+type], `${this.chalk.italic(interaction.user.displayName)} executed ${name} ${desc}`)
            try {
                await command.execute(this, interaction);
            } catch (error) {
                this.botLog(`Error executing ${interaction.commandName}`)
                this.botLog(error)
            }
        } else if (interaction.isAutocomplete()) {
            type = this.chalk.gray("Autocomplete")
            this.log([this.chalk.green.bold("Bot Client")+"/"+type], this.chalk.gray(`${this.chalk.italic(interaction.user.displayName)} is searching in ${name}`))
            try {
                await command.autocomplete(this, interaction);
            } catch (error) {
                this.botLog(`Error autocompleting ${interaction.commandName}`)
                this.botLog(error)
            }
        }
    }

    async onJoinGuild(guild: Discord.Guild) {
        this.botLog(`Joined Guild: ${guild.name}. Reloading modules.`)
        await this.unmountModules()
        await this.mountAllModules()
    }

    async onLogin(readyClient: Discord.Client) {
        await this.mountAllModules()
        this.botLog(`${this.chalk.green.bold.underline("Ready!")} Logged in as ${this.chalk.bold(readyClient.user.tag)}`);
        let activityTypes: Record<string, any> = {
            "COMPETING": Discord.ActivityType.Competing,
            "LISTENING": Discord.ActivityType.Listening,
            "PLAYING": Discord.ActivityType.Playing,
            "WATCHING": Discord.ActivityType.Watching,
        }
        readyClient.user.setActivity(process.env.BOT_STATUS_MESSAGE, {
            type: activityTypes[process.env.BOT_STATUS_TYPE as string]
        })

        for (let guild of this.client.guilds.cache.values()) {
            this.botLog(`Forcing guild ${guild.name} to refresh`)
            await guild.members.fetch({force: true})
            this.botLog(`${this.chalk.magenta(guild.name)} - All Guild Members Fetched`)
        }
    }
}
