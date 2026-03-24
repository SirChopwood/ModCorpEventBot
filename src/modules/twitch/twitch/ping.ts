// @ts-ignore
import {ChatMessage} from "@twurple/chat";
import TwitchModule from "../module";

export default {
    data: {
        name: "Ping",
        description: "A generic Ping command, but twitchy.",
    },
    async execute(
        twitchModule: TwitchModule,
        channel: string,
        user: string,
        message: ChatMessage,
        isModded: boolean,
        text: Array<string>
    ) {
        await twitchModule.replyToUser(channel, user, message, `Pong!`)
    }
}