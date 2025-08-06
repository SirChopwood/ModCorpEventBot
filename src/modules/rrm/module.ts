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
    session: any | null = null
    channels = JSON.parse(process.env.RRM_TWITCH_CHANNELS!) as Array<string>

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
        let botTokenFile = await fs.readFile(botTokenPath, "utf8")
        let botToken: AccessToken = JSON.parse(botTokenFile)


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

        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }

    async refreshSession() {
        for await (const userName of this.channels) {
            const userData = await this.apiClient.users.getUserByName(userName)
            if (!userData) {continue}
            let response = await fetch("https://louismayes.xyz/api/v1/rrm/session/fetch", {
                method: "POST",
                body: JSON.stringify({
                    "channel": {
                        "id": Number(userData!.id),
                        "name": String(userData!.displayName)
                    }
                }),
                headers: {"Content-type": "application/json"}
            })
            if (!response.ok) {continue}
            const data = await response.json()
            this.session = data[0]
            this.log(`Current Session set to ID ${this.bot.chalk.blue(this.session.id)}.`)
            break
        }
    }

    async onMessage(channel: string, user: string, text: string, message: ChatMessage) {
        if (text.startsWith(this.prefix)) {
            this.subLog([this.bot.chalk.magenta(channel)], `${this.bot.chalk.bold(user)}: ${text}`)

            const textSplit = text.replace(this.prefix, "").split(" ")
            if (textSplit[0].toLowerCase() === "dance") {
                if (this.session.id === null) {
                    await this.chatBot.say(channel, `There is no session currently open, please wait until one is opened or unlocked.`, {replyTo: message})
                    return
                }

                // REPLACE WITH ACTUAL ACTIVE SONGLISTS
                const sources: Record<string, string> = {
                    "PyPy": "https://jd.pypy.moe",
                    "VRDancing": "https://database.vrdancing.club",
                    "YouTube": "https://youtube.com"
                }
                let newMessage = `Remember to use "#sr (id/link)" to request either a song from the world or online source. Find the songs here:`
                for (let source of this.session.sources as string[]) {
                    if (sources[source]) {
                        newMessage = newMessage + " " + sources[source]
                    }
                }
                await this.chatBot.say(channel, newMessage, {replyTo: message})
                return

            } else if (textSplit[0].toLowerCase() === "sr") {
                if (textSplit.length !== 2) {
                    await this.chatBot.say(channel, `Please provide JUST the ID or Link to the song you want in the format "#sr (id/link)".`, {replyTo: message})
                    return
                } else if (this.session.id === null) {
                    await this.chatBot.say(channel, `There is no session currently open, please wait until one is opened or unlocked.`, {replyTo: message})
                    return
                }
                let response = await fetch("https://louismayes.xyz/api/v1/rrm/request/create", {
                    method: "POST",
                    body: JSON.stringify({
                        "user": user,
                        "request": textSplit[1],
                        "session": this.session.id
                    }),
                    headers: {"Content-type": "application/json"}
                })
                const reqData = await response.json()
                if (response.status === 200) {
                    let newMessage = `Added ${reqData[0].text}`
                    if (reqData[0].metadata.Source) {
                        newMessage = newMessage + ` from ${reqData[0].metadata.Source}`
                    }
                    await this.chatBot.say(channel, newMessage, {replyTo: message})
                    return
                } else {
                    await this.chatBot.say(channel, reqData.statusMessage, {replyTo: message})
                }
            } else {

                await this.chatBot.say(channel, "Unknown command.", {replyTo: message})

            }
        }
    }
}