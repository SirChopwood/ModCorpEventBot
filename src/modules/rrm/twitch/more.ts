// @ts-ignore
import {ChatMessage} from "@twurple/chat";
import TwitchModule from "../../twitch/module";
import RRMModule from "../module.js";

export default {
    data: {
        name: "More",
        description: "Requests the other channels in a session send in more requests.",
    },
    async execute(
        twitchModule: TwitchModule,
        channel: string,
        user: string,
        message: ChatMessage,
        isModded: boolean,
        text: Array<string>
    ) {
        let rrm = await twitchModule.bot.requireModule("rrm", RRMModule)

        if (!isModded) {
            await twitchModule.replyToUser(channel, user, message, `You do not have permission to use that command.`)
            return
        }

        let session = rrm.sessions[rrm.channels[channel]]

        if (!session) {
            await twitchModule.replyToUser(channel, user, message, `There is no session currently open, please wait until one is opened or unlocked.`)
            return
        }

        for await (let targetChannel of session.channels) {
            let channelInfo = await twitchModule.apiClient.users.getUserById(targetChannel)
            if (channelInfo) {
                await twitchModule.sendMessageToChannel(channelInfo?.name, `DJ ${user} is requesting some more songs, you can help by adding some using the ${twitchModule.prefix}sr command! Type ${twitchModule.prefix}dance for more info.`)
            }
        }
    }
}