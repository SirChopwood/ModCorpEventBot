// @ts-ignore
import * as Discord from "discord.js";
import * as fs from "node:fs";
import path from 'path';
import { fileURLToPath } from 'url';
import Permissions from "./permissions.js";
import DiscordBotModule from "./module";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class DiscordBot{
    commands: Discord.Collection<string, {data: any, execute: void}>
    modules: Discord.Collection<string, DiscordBotModule>
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

    log(source: Array<string>, ...args: any[]) {
        source.reverse()
        console.log(`${new Date().toLocaleString("EN-GB", {dateStyle: "short", timeStyle: "medium"})} [${source.join("/")}] -`, ...args);
    }
    
    async mountAllModules(desiredModules: Array<string> = JSON.parse(process.env.BOT_MODULES!)){
        const allModules = fs.readdirSync(path.join(__dirname, "./modules"), { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
        this.log(["Bot Client"],  `Found Modules: ${allModules}`)

        this.log(["Bot Client"], "Loading Modules...")
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
        this.log(["Bot Client"], "Done!")
        this.log(["Bot Client"], "Initialising Modules:")
        for (let key of this.modules.keys()) {
            await this.modules.get(key).initialise()
        }
        this.log(["Bot Client"], "Compiling Commands...")
        let newCommands: Array<Discord.Command> = []
        for (let command of this.commands.values()) {
            newCommands.push(command.data.toJSON())
        }
        this.log(["Bot Client"], `Total Commands: ${newCommands.length}`)
        this.log(["Bot Client"], "Applying to Guilds:")
        for (let guildId of this.client.guilds.cache.keys()) {
            await this.client.application.commands.set(newCommands, guildId);
            this.log(["Bot Client"], `- (${guildId}) ${this.client.guilds.cache.get(guildId)?.name}`)
        }
    }

    async unmountModules() {
        this.log(["Bot Client"], "Deinitialising Modules:")
        for (let moduleName of this.modules.keys()) {
            await this.modules.get(moduleName).deinitialise()
            this.modules.delete(moduleName)
        }
        this.log(["Bot Client"], "Done!")
    }

    async shutdown() {
        this.log(["Bot Client"], "Shutting Down...")
        await this.unmountModules()
        this.log(["Bot Client"], "Goodbye!")
        process.exit()
    }

    async onInteraction(interaction: Discord.Interaction) {
        if (interaction.isChatInputCommand()) { // Sends Slash Commands to be executed directly
            await this.onSlashCommand(interaction)
        } else if (interaction.customId) { // Forwards buttons, selects etc to relevant module
            const interactionModuleName = interaction.customId.split("-")[0]
            const interactionCustomId = interaction.customId.replace(`${interactionModuleName}-`, "")
            const interactionModule = this.modules.get(interactionModuleName)
            await interactionModule.onInteraction(interaction, interactionCustomId)
        }
    }

    async onSlashCommand(interaction: Discord.ChatInputCommandInteraction) {
        const command = this.commands.get(interaction.commandName)

        try {
            await command.execute(this, interaction);
        } catch (error) {
            this.log(["Bot Client"], `Error executing ${interaction.commandName}`)
            this.log(["Bot Client"], error)
        }
    }

    async onJoinGuild(guild: Discord.Guild) {
        this.log(["Bot Client"], `Joined Guild: ${guild.name}. Reloading modules.`)
        await this.unmountModules()
        await this.mountAllModules()
    }

    async onLogin(readyClient: Discord.Client) {
        await this.mountAllModules()
        this.log(["Bot Client"], `Ready! Logged in as ${readyClient.user.tag}`);
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
