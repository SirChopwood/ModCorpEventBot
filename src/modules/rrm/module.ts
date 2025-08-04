import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
// @ts-ignore
import {AccessToken, RefreshingAuthProvider} from "@twurple/auth";
// @ts-ignore
import {ChatClient, ChatMessage} from "@twurple/chat";
import {promises as fs} from "node:fs";
import path from "path";


export default class RRMModule extends DiscordBotModule {
    authProvider: RefreshingAuthProvider
    chatBot: ChatClient

    constructor(bot: DiscordBot, path: string) {
        super(bot, path, {
            name: "RRM",
            desc: "Rami Resource Manager - Connects to the online database, panel and overlays with Twitch Chat."
        });
    }

    async initialise(): Promise<void> {
        // Prepare values and local file
        const botTokenPath = path.join(this.path.replace("module.js", ""), "./twitchToken.json")
        let botTokenFile = await fs.readFile(botTokenPath, "utf8")
        let botToken: AccessToken = JSON.parse(botTokenFile)
        const channels = JSON.parse(process.env.RRM_TWITCH_CHANNELS!) as Array<string>

        // Create Authentication Credentials and setup auto-refresh
        this.authProvider = new RefreshingAuthProvider({
                "clientId": process.env.RRM_TWITCH_CLIENT,
                "clientSecret": process.env.RRM_TWITCH_SECRET
            })
        this.authProvider.onRefresh(async (userId: string, newToken: AccessToken) => {
            await fs.writeFile(botTokenPath, JSON.stringify(newToken, null, 4))
        })
        await this.authProvider.addUserForToken(botToken, ["chat"])

        // Create Chat bot
        this.chatBot = new ChatClient({
            authProvider: this.authProvider,
            channels: channels
        })
        await this.chatBot.connect()

        this.chatBot.onMessage(async (channel: string, user: string, text: string, message: ChatMessage) => {
            this.log(`[${channel}] ${user}: ${text}`)
            await this.chatBot.say(channel, text)
        })
        await super.initialise();
    }

    async deinitialise(): Promise<void> {
        await super.deinitialise();
    }
}