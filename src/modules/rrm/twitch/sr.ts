// @ts-ignore
import {ChatMessage} from "@twurple/chat";
import TwitchModule from "../../twitch/module";
import RRMModule from "../module.js";

export default {
    data: {
        name: "SR",
        description: "Requests a song for the current RRM Session.",
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

        if (!rrm.sessions[rrm.channels[channel]]) {
            await twitchModule.replyToUser(channel, user, message, `There is no session currently open, please wait until one is opened by a DJ.`)
            return
        }
        if (rrm.sessions[rrm.channels[channel]].requestStatus === "Locked") {
            await twitchModule.replyToUser(channel, user, message, `The sessions is currently locked, please wait until it is unlocked by a DJ.`)
            return
        }
        let response = await fetch(`${process.env.API_HOST}/api/rrm_v2/request/add`, {
            method: "POST",
            body: JSON.stringify({
                "user": user,
                "codes": [text[0]],
                "sessionId": rrm.sessions[rrm.channels[channel]].id,
                "token": process.env.API_TOKEN
            }),
            headers: {"Content-type": "application/json"}
        })

        let responseText = await response.text()
        if (response.status === 200) {
            try {
                let responseJson = JSON.parse(responseText)
                if (!responseJson) {
                    rrm.log(`Error while creating request!`)
                    await twitchModule.replyToUser(channel, user, message, "Failed to queue song, an error has occurred, @Ramiris_ has been notified.")
                    return
                } else if (responseJson instanceof Array) {
                    if (responseJson.length === 0) {
                        await twitchModule.replyToUser(channel, user, message, `Unable to find a match to that request. Please provide JUST the ID or Link to the song you want in the format ${twitchModule.prefix}sr (id/link).`)
                        return
                    }
                    let newMessage = `Added ${responseJson[0].text}`
                    if (responseJson[0].metadata.Source) {
                        newMessage = newMessage + ` from ${responseJson[0].metadata.Source}`
                    }
                    await twitchModule.replyToUser(channel, user, message, newMessage)
                    return
                }
            } catch (e) {
                await twitchModule.replyToUser(channel, user, message, responseText)
                return
            }
        } else {
            rrm.log(`Creation request failed!`)
            rrm.log(await response.text())
            await twitchModule.replyToUser(channel, user, message, "Failed to queue song, unable to connect to server, @Ramiris_ has been notified.")
            return
        }
    }
}