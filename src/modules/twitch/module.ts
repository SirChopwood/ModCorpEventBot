import DiscordBotModule, {DiscordBotModuleType, DiscordBotSubModule, DiscordCommandSubModule} from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import {AccessToken, RefreshingAuthProvider} from "@twurple/auth";
// @ts-ignore
import {ChatClient, ChatMessage} from "@twurple/chat";
// @ts-ignore
import {ApiClient} from "@twurple/api";
import fs, {promises as pfs} from "node:fs";
import path from "path";
// @ts-ignore
import * as Discord from "discord.js";


export default class TwitchModule extends DiscordBotModule {
    authProvider: RefreshingAuthProvider
    chatBot: ChatClient
    apiClient: ApiClient
    prefix = process.env.RRM_TWITCH_PREFIX || "!"
    chatMods = JSON.parse(process.env.RRM_TWITCH_MODS!) as Array<string> || ['Ramiris_']
    commands: Discord.Collection<string, {data: any, execute: void}> = new Discord.Collection()

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "Twitch",
            desc: "Implements the Twurple Twitch Chat API Library.",
            colour: "magenta"
        });
    }

    async initialise(): Promise<void> {
        // Prepare values and local file
        const botTokenPath = path.join(this.path.replace("module.js", ""), "./twitchToken.json")
        let botToken: AccessToken = {}

        if (await pfs.stat(botTokenPath)) {
            let botTokenFile = await pfs.readFile(botTokenPath, "utf8")
            botToken = JSON.parse(botTokenFile)
        } else {
            await pfs.writeFile(botTokenPath,
                JSON.stringify({
                    "accessToken": "",
                    "refreshToken": "",
                    "expiresIn": null,
                    "obtainmentTimestamp": 0
                }), "utf8")
            let botTokenFile = await pfs.readFile(botTokenPath, "utf8")
            botToken = JSON.parse(botTokenFile)
        }

        // Create Authentication Credentials and setup auto-refresh
        this.authProvider = new RefreshingAuthProvider({
            "clientId": process.env.RRM_TWITCH_CLIENT,
            "clientSecret": process.env.RRM_TWITCH_SECRET
        })
        this.authProvider.onRefresh(async (userId: string, newToken: AccessToken) => {
            await pfs.writeFile(botTokenPath, JSON.stringify(newToken, null, 4))
        })
        await this.authProvider.addUserForToken(botToken, ["chat"])
        this.log("Authenticated with Twitch")

        // Create Chat bot
        this.chatBot = new ChatClient({
            authProvider: this.authProvider,
            channels: ["ramiris_"]
        })
        this.apiClient = new ApiClient({authProvider: this.authProvider})

        // Connect to the Twitch API
        this.chatBot.onConnect(this.onConnect.bind(this))
        await this.chatBot.connect()

        // Message Handling
        this.chatBot.onMessage(this.onMessage.bind(this))
        await new TwitchCommandSubModule(this).initialise()
        await super.initialise()
    }

    async onConnect() {
        this.log(this.bot.chalk.magenta("Connected to Twitch!"))
        // Join any defined starting channels.
        let startingChannels = JSON.parse(process.env.RRM_TWITCH_CHANNELS!) as Array<string> || ['Ramiris_']
        this.log(`Connecting to ${this.bot.chalk.blue(startingChannels.length)} channels.`)
        await this.joinChannelChat(startingChannels)
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async joinChannelChat(channels: Array<string>) {
        let result = []
        for await (let channel of channels) {
            if (!this.chatBot.currentChannels.includes(`#${channel}`)) {
                await this.chatBot.join(channel)
                result.push(channel)
            }
        }
        if (result.length > 0) {
            this.log(`Joined the chats for ${this.bot.chalk.magenta(result.join(", "))}.`)
        }
    }

    async replyToUser(channel: string, user: string, message: ChatMessage, response: string){
        await this.chatBot.say(channel, response, {replyTo: message})
        const header = this.bot.chalk.bold(`${this.bot.chalk.blue(this.chatBot.irc.currentNick)} -> ${this.bot.chalk.magenta(user)}`)
        this.subLog([this.bot.chalk.magenta(channel)], `${header}: ${response}`)
    }

    async sendMessageToChannel(channel: string, response: string){
        await this.chatBot.say(channel, response)
        const header = this.bot.chalk.bold(`${this.bot.chalk.blue(this.chatBot.irc.currentNick)}`)
        this.subLog([this.bot.chalk.magenta(channel)], `${header}: ${response}`)
    }

    async onMessage(channel: string, user: string, text: string, message: ChatMessage) {
        if (text.toLowerCase().includes(this.chatBot.irc.currentNick)) {
            const header = this.bot.chalk.bold(`${this.bot.chalk.magenta(user)} -> ${this.bot.chalk.blue(this.chatBot.irc.currentNick)}`)
            this.subLog([this.bot.chalk.magenta(channel)], `${header}: ${text}`)
        }
        if (text.startsWith(this.prefix)) {
            let isModded = false
            for (let mod of this.chatMods) {
                if (user.toLowerCase() === mod.toLowerCase()) {
                    isModded = true
                }
            }

            const textSplit = text.replace(this.prefix, "").split(" ")
            const commandText = textSplit.shift()
            let command = this.commands.get(commandText?.toLowerCase())
            if (command) {
                this.subLog([this.bot.chalk.magenta(channel)], `${this.bot.chalk.italic(user)} executed ${this.bot.chalk.magentaBright(commandText)} ${textSplit.join(", ")}`)
                await command.execute(this, channel, user, message, isModded, textSplit)
            } else {
                this.log(`Unknown Command: ${text}`)
            }
        }
    }
}

export class TwitchCommandSubModule extends DiscordBotSubModule {
    twitchModule: TwitchModule | undefined
    constructor(module: DiscordBotModuleType) {
        super(module, "twitch")
    }

    async initialise() {
        this.twitchModule = await this.module.bot.getModule("twitch", TwitchModule)
        if (this.twitchModule) {
            await super.initialise()
        }
    }

    protected async registerFile(name: string, path: string, data: any) {
        await super.registerFile(name, path, data)
        this.twitchModule?.commands.set(data.data.name.toLowerCase(), data)
        this.module.log(`${this.module.bot.chalk.magentaBright("Twitch Command")}: ${data.data.name} ${this.module.bot.chalk.grey(` - ${data.data.description}`)}`)
    }
}