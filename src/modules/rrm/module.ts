import DiscordBotModule from "../../module.js";
import DiscordBot from "../../bot";
import TwitchModule from "../twitch/module";


export default class RRMModule extends DiscordBotModule {
    twitch: TwitchModule | undefined
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

    override async postInit(): Promise<void> {
        let twitch = this.bot.modules.get("twitch") as TwitchModule | undefined
        if (!twitch) {
            this.log(this.bot.chalk.bold.redBright("Twitch Module not found!"))
            return
        }
        this.twitch = twitch
        this.refreshTimer = setInterval(this.refreshSession.bind(this), 30000)
        await super.postInit();
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
            let users = await this.twitch!.apiClient.users.getUsersByIds(newData.channels)
            let userIds: Array<string> = []
            for (let user of users) {
                if (this.channels[user.name] !== newData.id) {
                    this.channels[String(user.name)] = newData.id
                    this.log(`Added ${this.bot.chalk.magenta(user.name)} to Session ID ${this.bot.chalk.green(newData.id)}.`)
                }
                updatedChannels.push(user.name)
                userIds.push(String(user.name))
            }
            await this.twitch!.joinChannelChat(userIds)
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
}