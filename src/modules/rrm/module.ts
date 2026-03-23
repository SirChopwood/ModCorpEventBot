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
            setTimeout(this.refreshSession.bind(this), 5000)
        })
        await this.chatBot.connect()
        let startingChannels = JSON.parse(process.env.RRM_TWITCH_CHANNELS!) as Array<string> || ['Ramiris_']
        this.log(`Connecting to ${this.bot.chalk.blue(startingChannels.length)} channels.`)
        await this.joinChannelChat(startingChannels)

        this.chatBot.onMessage(this.onMessage.bind(this))

        this.refreshTimer = setInterval(this.refreshSession.bind(this), 30000)

        await super.initialise();
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

    async refreshSession() {
        //this.log("Refreshing session...")
        let response = await fetch(`${process.env.API_HOST}/api/rrm_v2/session/active`, {
            method: "POST",
            body: JSON.stringify({
                "token": process.env.API_TOKEN
            }),
            headers: {"Content-type": "application/json"}
        })
        if (!response.ok) {return}
        const data = await response.json()

        let updatedSessions: Array<string> = []
        let updatedChannels: Array<string> = []

        for await (const newData of data.sessions) {
            let oldData = this.sessions[String(newData.id)]

            if (oldData) {
                this.sessions[String(newData.id)] = newData
                //this.log(`Updated Session ID ${this.bot.chalk.blue(newData.id)}.`)
                updatedSessions.push(String(newData.id))
            } else {
                this.sessions[String(newData.id)] = newData
                this.log(`Added Session ID ${this.bot.chalk.green(newData.id)}.`)
                updatedSessions.push(String(newData.id))
            }
            let users = await this.apiClient.users.getUsersByIds(newData.channels)
            let userIds: Array<string> = []
            for (let user of users) {
                if (this.channels[user.name] !== newData.id) {
                    this.channels[String(user.name)] = newData.id
                    this.log(`Added ${this.bot.chalk.magenta(user.name)} to Session ID ${this.bot.chalk.green(newData.id)}.`)
                }
                updatedChannels.push(user.name)
                userIds.push(String(user.name))
            }
            await this.joinChannelChat(userIds)
        }
        for (let userName of Object.keys(this.channels)) {
            if (!updatedChannels.includes(userName)) {
                this.log(`Removed ${this.bot.chalk.magenta(userName)} from Session ID ${this.bot.chalk.red(this.channels[userName])}.`)
                delete this.channels[userName]
            }
        }
        for (let sessiondId of Object.keys(this.sessions)) {
            if (!updatedSessions.includes(String(sessiondId))) {
                this.log(`Removed Session ID ${this.bot.chalk.red(String(sessiondId))}.`)
                delete this.sessions[String(sessiondId)]
            }
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
            this.subLog([this.bot.chalk.magenta(channel)], `${this.bot.chalk.bold(user)}: ${text}`)

            let isModded = false

            for (let mod of this.chatMods) {
                if (user.toLowerCase() === mod.toLowerCase()) {
                    isModded = true
                }
            }

            const textSplit = text.replace(this.prefix, "").split(" ")
            if (textSplit[0].toLowerCase() === "ping") {
                await this.replyToUser(channel, user, message, `Pong!`)
                return
            } else if (textSplit[0].toLowerCase() === "dance") {
                if (!this.sessions[this.channels[channel]]) {
                    await this.replyToUser(channel, user, message, `There is no session currently open, please wait until one is opened or unlocked.`)
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
                await this.replyToUser(channel, user, message, newMessage)
                return

            } else if (textSplit[0].toLowerCase() === "sr") {
                if (!this.sessions[this.channels[channel]]) {
                    await this.replyToUser(channel, user, message, `There is no session currently open, please wait until one is opened by a DJ.`)
                    return
                }
                if (this.sessions[this.channels[channel]].requestStatus === "Locked") {
                    await this.replyToUser(channel, user, message, `The sessions is currently locked, please wait until it is unlocked by a DJ.`)
                    return
                }
                let response = await fetch(`${process.env.API_HOST}/api/rrm_v2/request/add`, {
                    method: "POST",
                    body: JSON.stringify({
                        "user": user,
                        "codes": [textSplit[1]],
                        "sessionId": this.sessions[this.channels[channel]].id,
                        "token": process.env.API_TOKEN
                    }),
                    headers: {"Content-type": "application/json"}
                })

                let responseText = await response.text()
                if (response.status === 200) {
                    try {
                        let responseJson = JSON.parse(responseText)
                        if (responseText === "[]" || responseJson.length === 0) {
                            await this.replyToUser(channel, user, message, `Unable to find a match to that request. Please provide JUST the ID or Link to the song you want in the format ${this.prefix}sr (id/link).`)
                            return
                        }
                        let newMessage = `Added ${responseJson[0].text}`
                        if (responseJson[0].metadata.Source) {
                            newMessage = newMessage + ` from ${responseJson[0].metadata.Source}`
                        }
                        await this.replyToUser(channel, user, message, newMessage)
                        return
                    } catch (e) {
                        this.log(`Error while creating request!`)
                        await this.replyToUser(channel, user, message, "Failed to queue song, an error has occurred, @Ramiris_ has been notified.")
                        return
                    }
                } else {
                    this.log(`Creation request failed!`)
                    this.log(await response.text())
                    await this.replyToUser(channel, user, message, "Failed to queue song, unable to connect to server, @Ramiris_ has been notified.")
                    return
                }
            } else if (textSplit[0].toLowerCase() === "more" && isModded) {
                for (let targetChannel of this.sessions[this.channels[channel]].channels) {
                    await this.sendMessageToChannel(targetChannel, `DJ ${user} is requesting some more songs, you can help by adding some using the ${this.prefix}sr command! Type ${this.prefix}dance for more info.`)
                }
            } else {
                    this.log(`Unknown Command: ${text}`)
                }
            }
    }
}