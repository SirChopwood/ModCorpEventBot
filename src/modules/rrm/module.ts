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
    sessions: Record<string, any> = {} // ID -> Session Info
    channels: Record<string, string> = {} // ChannelName -> SessionID
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
            channels: ["ramiris_"]
        })
        this.apiClient = new ApiClient({authProvider: this.authProvider})

        this.chatBot.onConnect(async () => {
            this.log(this.bot.chalk.magenta("Connected to Twitch!"))
            await this.refreshSession()
        })
        await this.chatBot.connect()
        let startingChannels = JSON.parse(process.env.RRM_TWITCH_CHANNELS!) as Array<string> || ['Ramiris_']
        this.log(`Connecting to ${this.bot.chalk.blue(startingChannels.length)} channels.`)
        for (let channel of startingChannels) {
            await this.joinChannelChat(channel)
        }

        this.chatBot.onMessage(this.onMessage.bind(this))

        this.refreshTimer = setInterval(this.refreshSession.bind(this), 30000)

        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async joinChannelChat(channel: string) {
        if (!this.chatBot.currentChannels.includes(channel)) {
            await this.chatBot.join(channel)
            this.log(`Joining ${this.bot.chalk.magenta(channel)}'s chat.`)
        }
    }

    async refreshSession() {
        let response = await fetch(`https://prydwen5.sirchopwood.workers.dev/api/rrm_v2/session/active`, {
            method: "POST",
            headers: {"Content-type": "application/json"}
        })
        if (!response.ok) {return}
        const data = await response.json()

        let newSessions: Record<string, any> = {}
        let newChannels: Record<string, any> = {}
        // ADD OR UPDATE NEW/EXISTING SESSIONS
        for await (const newData of data.sessions) {
            let oldData = this.sessions[String(newData.id)]

            if (newData && oldData) {
                if (newData !== oldData) {
                    newSessions[String(newData.id)] = newData
                    this.log(`Updated Session ID ${this.bot.chalk.blue(newData.id)}.`)
                    for (let userId of newData.channels) {
                        let user = await this.apiClient.users.getUserById(userId)
                        if (!Object.keys(this.channels).includes(user?.name)) {
                            newChannels[String(user?.name)] = newData.id
                            await this.joinChannelChat(user?.name)
                            this.log(`Added ${this.bot.chalk.magenta(user?.name)} to Session ID ${this.bot.chalk.green(newData.id)}.`)
                        }
                    }
                }
            } else if (!oldData) {
                newSessions[String(newData.id)] = newData
                this.log(`Added Session ID ${this.bot.chalk.green(newData.id)}.`)
            }
        }
        this.sessions = newSessions
        this.channels = newChannels
        // REMOVE OLD SESSIONS
        for (const oldData of Object.values(this.sessions)) {
            if (!Object.keys(newSessions).includes(String(oldData.id))) {
                this.log(`Removed Session ID ${this.bot.chalk.red(oldData.id)}.`)
            }
        }
        // REMOVE OLD CHANNELS
        for (const oldChannel of Object.keys(this.channels)) {
            if (!Object.keys(newChannels).includes(oldChannel)) {
                this.log(`Removed ${this.bot.chalk.magenta(oldChannel)} from Session ID ${this.bot.chalk.red(this.channels[oldChannel])}.`)
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
                if (!this.sessions[this.channels[channel]]) {
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
                for (let source of this.sessions[this.channels[channel]].sources as string[]) {
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
                } else if (!this.sessions[this.channels[channel]]) {
                    await this.chatBot.say(channel, `There is no session currently open, please wait until one is opened or unlocked.`, {replyTo: message})
                    return
                }
                let response = await fetch(`${process.env.API_HOST}/api/v1/rrm/request/create`, {
                    method: "POST",
                    body: JSON.stringify({
                        "user": user,
                        "codes": [textSplit[1]],
                        "sessionId": this.sessions[this.channels[channel]].id
                    }),
                    headers: {"Content-type": "application/json"}
                })

                if (response.status === 200) {
                    try {
                        let responseJson = await response.json()
                        if (responseJson.length === 0) {
                            await this.chatBot.say(channel, "Unable to find a match to that request.", {replyTo: message})
                            return
                        }
                        let newMessage = `Added ${responseJson[0].text}`
                        if (responseJson[0].metadata.Source) {
                            newMessage = newMessage + ` from ${responseJson[0].metadata.Source}`
                        }
                        await this.chatBot.say(channel, newMessage, {replyTo: message})
                        return
                    } catch (e) {
                        this.log(`Error while creating request!`)
                        await this.chatBot.say(channel, "Failed to queue song, an error has occurred, @Ramiris_ has been notified.", {replyTo: message})
                        return
                    }
                } else {
                    this.log(`Creation request failed!`)
                    await this.chatBot.say(channel, "Failed to queue song, unable to connect to server, @Ramiris_ has been notified.", {replyTo: message})
                    return
                }
            } else if (textSplit[0].toLowerCase() === "more" && isModded) {
                for (let targetChannel of this.sessions[this.channels[channel]].channels) {
                    await this.chatBot.say(targetChannel, `DJ ${user} is requesting some more songs, you can help by adding some using the ${this.prefix}sr command! Type ${this.prefix}dance for more info.`)
                }
            } else {
                    this.log(`Unknown Command: ${text}`)
                }
            }
    }
}