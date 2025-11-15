import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import {AccessToken, RefreshingAuthProvider} from "@twurple/auth";
// @ts-ignore
import {ChatClient, ChatMessage} from "@twurple/chat";
// @ts-ignore
import {ApiClient} from "@twurple/api";
import {promises as fs} from "node:fs";
import path from "path";


export default class RRMModule extends DiscordBotModule {
    authProvider: RefreshingAuthProvider
    chatBot: ChatClient
    apiClient: ApiClient
    prefix = process.env.RRM_TWITCH_PREFIX || "!"
    chatMods = JSON.parse(process.env.RRM_TWITCH_MODS!) as Array<string> || ['Ramiris_']
    sessions: Record<string, any> = {}
    channels = JSON.parse(process.env.RRM_TWITCH_CHANNELS!) as Array<string> || ['Ramiris_']
    refreshTimer: NodeJS.Timeout | null = null

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "RRM",
            desc: "Rami Resource Manager - Connects to the online database, panel and overlays with Twitch Chat.",
            colour: "magenta"
        });
    }

    async initialise(): Promise<void> {
        // Prepare values and local file
        const botTokenPath = path.join(this.path.replace("module.js", ""), "./twitchToken.json")
        let botToken: AccessToken = {}

        if (await fs.stat(botTokenPath)) {
            let botTokenFile = await fs.readFile(botTokenPath, "utf8")
            botToken = JSON.parse(botTokenFile)
        } else {
            await fs.writeFile(botTokenPath,
                JSON.stringify({
                    "accessToken": "",
                    "refreshToken": "",
                    "expiresIn": null,
                    "obtainmentTimestamp": 0
                }), "utf8")
            let botTokenFile = await fs.readFile(botTokenPath, "utf8")
            botToken = JSON.parse(botTokenFile)
        }

        // Create Authentication Credentials and setup auto-refresh
        this.authProvider = new RefreshingAuthProvider({
                "clientId": process.env.RRM_TWITCH_CLIENT,
                "clientSecret": process.env.RRM_TWITCH_SECRET
            })
        this.authProvider.onRefresh(async (userId: string, newToken: AccessToken) => {
            await fs.writeFile(botTokenPath, JSON.stringify(newToken, null, 4))
        })
        await this.authProvider.addUserForToken(botToken, ["chat"])
        this.log("Authenticated with Twitch")

        // Create Chat bot
        this.chatBot = new ChatClient({
            authProvider: this.authProvider,
            channels: this.channels
        })
        this.apiClient = new ApiClient({authProvider: this.authProvider})

        this.chatBot.onConnect(async () => {
            this.log(this.bot.chalk.magenta("Connected to Twitch!"))
            await this.refreshSession()
        })
        await this.chatBot.connect()
        this.log(`Connecting to ${this.bot.chalk.blue(this.channels.length)} channels.`)

        this.chatBot.onMessage(this.onMessage.bind(this))

        this.refreshTimer = setInterval(this.refreshSession.bind(this), 30000)

        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async refreshSession() {
        let requestData = []
        for await (const userName of this.channels) {
            const userData = await this.apiClient.users.getUserByName(userName)
            if (!userData) {continue}
            requestData.push({
                "id": Number(userData!.id),
                "name": String(userData!.displayName)
            })
        }

        let response = await fetch(`${process.env.API_HOST}/api/v1/rrm/session/fetch`, {
            method: "POST",
            body: JSON.stringify({
                "channels": requestData
            }),
            headers: {"Content-type": "application/json"}
        })
        if (!response.ok) {return}
        const data = await response.json()
        for await (const sessionDataKey of this.channels) {
            let newData = data[sessionDataKey]
            let oldData = this.sessions[sessionDataKey.toLowerCase()]

            if (!newData && oldData) {
                delete this.sessions[sessionDataKey.toLowerCase()]
                this.log(`Removed ${this.bot.chalk.yellow(sessionDataKey)} from Session ID ${this.bot.chalk.red(oldData.id)}.`)
            } else if (newData && oldData) {
                if (newData.id === oldData.id) {continue}
                this.sessions[sessionDataKey.toLowerCase()] = data[sessionDataKey]
                this.log(`Updated ${this.bot.chalk.yellow(sessionDataKey)} to Session ID ${this.bot.chalk.blue(newData.id)}.`)
            } else if (newData && !oldData) {
                this.sessions[sessionDataKey.toLowerCase()] = data[sessionDataKey]
                this.log(`Added ${this.bot.chalk.yellow(sessionDataKey)} to Session ID ${this.bot.chalk.green(newData.id)}.`)
            }
        }
    }

    async onMessage(channel: string, user: string, text: string, message: ChatMessage) {
        if (text.startsWith(this.prefix)) {
            this.subLog([this.bot.chalk.magenta(channel)], `${this.bot.chalk.bold(user)}: ${text}`)

            let isModded = false

            for (let mod of this.chatMods) {
                if (user.toLowerCase() === mod.toLowerCase()) {
                    isModded = true
                }
            }

            const textSplit = text.replace(this.prefix, "").split(" ")
            if (textSplit[0].toLowerCase() === "dance") {
                if (!this.sessions[channel]) {
                    await this.chatBot.say(channel, `There is no session currently open, please wait until one is opened or unlocked.`, {replyTo: message})
                    return
                }

                // REPLACE WITH ACTUAL ACTIVE SONGLISTS
                const sources: Record<string, string> = {
                    "PyPy": "https://pypysongs.varkaria.works",
                    "VRDancing": "https://database.vrdancing.club",
                    "YouTube": "https://youtube.com"
                }
                let newMessage = `Remember to use "${this.prefix}sr (id/link)" to request either a song from the world or online source. Find the songs here:`
                for (let source of this.sessions[channel].sources as string[]) {
                    if (sources[source]) {
                        newMessage = newMessage + " " + sources[source]
                    }
                }
                await this.chatBot.say(channel, newMessage, {replyTo: message})
                return

            } else if (textSplit[0].toLowerCase() === "sr") {
                if (textSplit.length !== 2) {
                    await this.chatBot.say(channel, `Please provide JUST the ID or Link to the song you want in the format "${this.prefix}sr (id/link)".`, {replyTo: message})
                    return
                } else if (!this.sessions[channel]) {
                    await this.chatBot.say(channel, `There is no session currently open, please wait until one is opened or unlocked.`, {replyTo: message})
                    return
                }
                let response = await fetch(`${process.env.API_HOST}/api/v1/rrm/request/create`, {
                    method: "POST",
                    body: JSON.stringify({
                        "user": user,
                        "request": textSplit[1],
                        "session": this.sessions[channel].id
                    }),
                    headers: {"Content-type": "application/json"}
                })

                let responseData = await response.text()
                if (responseData === "[]") {
                    this.log(`Error while creating request!`)
                    await this.chatBot.say(channel, "Failed to queue song, @Ramiris_ has been notified.", {replyTo: message})
                    return
                }
                let responseJson = JSON.parse(responseData)
                if (response.status === 200) {
                    let newMessage = `Added ${responseJson[0].text}`
                    if (responseJson[0].metadata.Source) {
                        newMessage = newMessage + ` from ${responseJson[0].metadata.Source}`
                    }
                    await this.chatBot.say(channel, newMessage, {replyTo: message})
                    return
                } else {
                    await this.chatBot.say(channel, responseJson.statusMessage, {replyTo: message})
                }
            } else if (textSplit[0].toLowerCase() === "more" && isModded) {
                for (let channelKey of Object.keys(this.sessions)) {
                    if (this.sessions[channelKey].id === this.sessions[channel.toLowerCase()].id) {
                        await this.chatBot.say(channelKey, `DJ ${user} is requesting some more songs, you can help by adding some using the ${this.prefix}sr command! Type ${this.prefix}dance for more info.`)
                    }
                }
            } else {
                    this.log(`Unknown Command: ${text}`)
                }
            }
    }
}