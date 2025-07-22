// @ts-ignore
import * as Discord from "discord.js";
import * as fs from "node:fs";
import path from 'path';
import { fileURLToPath } from 'url';
import Permissions from "./permissions.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class DiscordBot{
    commands: Discord.Collection<string, any>
    modules: Discord.Collection<string, any>
    client: Discord.Client;
    permissions: Permissions

    constructor() {
        this.client = new Discord.Client({
            intents: [
                Discord.GatewayIntentBits.Guilds,
                Discord.GatewayIntentBits.GuildMessages,
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

        this.client.once(Discord.Events.ClientReady, (readyClient: Discord.Client) => this.onLogin(readyClient))
        this.client.on(Discord.Events.InteractionCreate, (interaction: Discord.Interaction) => this.onInteraction(interaction))
        this.client.on(Discord.Events.GuildCreate, (guild: Discord.Guild) => this.onJoinGuild(guild))
    }

    async mountAllModules(desiredModules: Array<string> = JSON.parse(process.env.BOT_MODULES!)){
        const allModules = fs.readdirSync(path.join(__dirname, "./modules"), { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
        console.log(`Found Modules: ${allModules}`)

        console.log("Loading Modules...")
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
                this.modules.set(desiredModule.toLowerCase(), module)
            }
        }
        console.log("Done!")
        console.log("Initialising Modules:")
        for (let key of this.modules.keys()) {
            await this.modules.get(key).initialise()
        }
        console.log("Compiling Commands...")
        let newCommands: Array<Discord.Command> = []
        for (let command of this.commands.values()) {
            newCommands.push(command.data.toJSON())
        }
        console.log(`Total Commands: ${newCommands.length}`)
        console.log("Applying to Guilds:")
        for (let guildId of this.client.guilds.cache.keys()) {
            await this.client.application.commands.set(newCommands, guildId);
            console.log(`- (${guildId}) ${this.client.guilds.cache.get(guildId)?.name}`)
        }
    }

    async unmountModules() {
        console.log("Deinitialising Modules:")
        for (let moduleName of this.modules.keys()) {
            await this.modules.get(moduleName).deinitialise()
            this.modules.delete(moduleName)
        }
        console.log("Done!")
    }

    async shutdown() {
        console.log("Shutting Down...")
        await this.unmountModules()
        console.log("Goodbye!")
        process.exit()
    }

    async onInteraction(interaction: Discord.Interaction) {
        if (interaction.isChatInputCommand()) {
            await this.onSlashCommand(interaction)
        }
    }

    async onSlashCommand(interaction: Discord.ChatInputCommandInteraction) {
        const command = this.commands.get(interaction.commandName)

        try {
            await command.execute(this, interaction);
        } catch (error) {
            console.log(`Error executing ${interaction.commandName}`)
            console.log(error)
        }
    }

    async onJoinGuild(guild: Discord.Guild) {
        console.log(`Joined Guild: ${guild.name}. Reloading modules.`)
        await this.unmountModules()
        await this.mountAllModules()
    }

    async onLogin(readyClient: Discord.Client) {
        await this.mountAllModules()
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
        let activityTypes: Record<string, any> = {
            "COMPETING": Discord.ActivityType.Competing,
            "LISTENING": Discord.ActivityType.Listening,
            "PLAYING": Discord.ActivityType.Playing,
            "WATCHING": Discord.ActivityType.Watching,
        }
        readyClient.user.setActivity(process.env.BOT_STATUS_MESSAGE, {
            type: activityTypes[process.env.BOT_STATUS_TYPE as string]
        })
    }
}
