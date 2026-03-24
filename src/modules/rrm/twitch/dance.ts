// @ts-ignore
import {ChatMessage} from "@twurple/chat";
import TwitchModule from "../../twitch/module";
import RRMModule from "../module";

export default {
    data: {
        name: "Dance",
        description: "Displays info about the RRM commands for a channel.",
    },
    async execute(
        twitchModule: TwitchModule,
        channel: string,
        user: string,
        message: ChatMessage,
        isModded: boolean,
        text: Array<string>
    ) {
        let rrm = twitchModule.bot.modules.get("rrm") as RRMModule

        if (!rrm.sessions[rrm.channels[channel]]) {
            await twitchModule.replyToUser(channel, user, message, `There is no session currently open, please wait until one is opened or unlocked.`)
            return
        }

        // REPLACE WITH ACTUAL ACTIVE SONGLISTS
        const sources: Record<string, string> = {
            "PyPy": "https://pypysongs.varkaria.works",
            "VRDancing": "https://database.vrdancing.club",
            "YouTube": "https://youtube.com"
        }
        let newMessage = `Remember to use "${twitchModule.prefix}sr (id/link)" to request either a song from the world or online source. Find the songs here:`
        for (let source of rrm.sessions[rrm.channels[channel]].sources as string[]) {
            if (sources[source]) {
                newMessage = newMessage + " " + sources[source]
            }
        }
        await twitchModule.replyToUser(channel, user, message, newMessage)
    }
}