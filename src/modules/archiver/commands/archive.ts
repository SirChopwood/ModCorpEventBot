// @ts-ignore
import * as Discord from "discord.js";
import DiscordBot from "../../../bot.js";
import ArchiverModule from "../module.js";


export default {
    data: new Discord.ContextMenuCommandBuilder()
        .setName('archive from message')
        .setType(Discord.ApplicationCommandType.Message),
    data2: new Discord.SlashCommandBuilder()
        .setName('archive')
        .setDescription("[Admin] Archive the channel in question."),
    async execute(bot: DiscordBot, interaction: Discord.ChatInputCommandInteraction) {
        if (!bot.permissions.isAdmin(interaction.user)) {
            await interaction.reply({content: "You do not have permission for this!", flags: Discord.MessageFlags.Ephemeral});
        }
        let module = await bot.requireModule("archiver", ArchiverModule)

        let sourceChannel = interaction.channel as Discord.BaseGuildTextChannel
        if (!sourceChannel || !interaction.channel.isTextBased()) {
            await interaction.reply({content: "This can only be used in a text channel of a guild!", flags: [Discord.MessageFlags.Ephemeral]})
            return
        }

        let targetInfo = module.targetChannels.get(interaction.user.id)
        if (!targetInfo) {
            await interaction.reply({content: "Please first designate a target Forum channel!", flags: [Discord.MessageFlags.Ephemeral]})
            return
        }
        let targetGuild: Discord.Guild | undefined
        let targetChannel: Discord.ForumChannel | undefined
        try {
            targetGuild = await bot.client.guilds.fetch(targetInfo.guild)
            targetChannel = await targetGuild.channels.fetch(targetInfo.channel)
        } catch (e) {
            module.targetChannels.delete(interaction.user.id)
            await interaction.reply({content: "Something went wrong, please re-designate a target Forum channel!", flags: [Discord.MessageFlags.Ephemeral]})
            return
        }

        // Try to find matching existing thread
        let targetThread: Discord.ThreadChannel | undefined
        await targetChannel.threads.fetch()
        for (let thread of targetChannel.threads.cache.values()) {
            if (thread.name === `#${sourceChannel.name}`) {
                targetThread = thread
            }
        }
        // Create a new one if none found
        if (!targetThread) {
            targetThread = await targetChannel.threads.create({
                name: `#${sourceChannel.name}`,
                message: `Archiving #${sourceChannel.name} from ${sourceChannel.guild.name}`,
                reason: `Archiving #${sourceChannel.name} from ${sourceChannel.guild.name}`})
        }
        // Error if neither work
        if (!targetThread) {
            await interaction.reply({content: "Failed to create a new thread for the archive!", flags: [Discord.MessageFlags.Ephemeral]})
            return
        }

        let targetWebhook = (await targetChannel.fetchWebhooks()).first()
        if (!targetWebhook) {
            await interaction.reply({content: "Failed to fetch Webhook, please re-designate a target Forum channel!", flags: [Discord.MessageFlags.Ephemeral]})
            return
        }

        let targetMessage: Discord.Message | undefined
        if (interaction.isMessageContextMenuCommand()) {
            targetMessage = interaction.targetMessage
            if (!targetMessage) {
                await interaction.reply({content: "Bot cannot find the target message!", flags: [Discord.MessageFlags.Ephemeral]})
                return
            }
        } else {
            targetMessage = (await sourceChannel.messages.fetch()).first()
            if (!targetMessage) {
                await interaction.reply({content: "Bot cannot find the first message!", flags: [Discord.MessageFlags.Ephemeral]})
                return
            }
        }

        // STARTS THE TIMER
        await interaction.reply({content: `# Archiving... \nFrom: *#${sourceChannel.name}* **(${interaction.guild.name})**\nTo: *#${targetChannel.name}* **(${targetGuild.name})**`, flags: [Discord.MessageFlags.Ephemeral]})
        let archiveStartTime = Date.now()

        await archiveMessage(targetWebhook, targetThread.id, targetMessage) // dont forget the first message
        await archiveBatch(sourceChannel, targetWebhook, targetThread, targetMessage.id)

        // AFTER ARCHIVAL COMPLETES
        let archiveTime = Date.now() - archiveStartTime
        await interaction.followUp({content: `# Archival Completed! \nTotal Time: ${Math.floor(archiveTime/1000)}s`, flags: [Discord.MessageFlags.Ephemeral]})
        return
    }
}

async function archiveBatch(sourceChannel: Discord.TextChannel, targetWebhook: Discord.Webhook, targetThread: Discord.Channel, startId: Discord.Snowflake)  {
    // Get next 10 messages
    let messageBatch = await sourceChannel.messages.fetch({ limit: 10, after: startId })
    messageBatch = messageBatch.reverse()
    if (messageBatch.size > 0) {
        // Process each one individually
        for await (let message of messageBatch.values()) {
            await archiveMessage(targetWebhook, targetThread.id, message)
        }
        // Recursively loop if not at the final message
        if (messageBatch.last().id !== sourceChannel.lastMessageId) {
            await archiveBatch(sourceChannel, targetWebhook, targetThread, messageBatch.last().id)
        }
    }
}

async function archiveMessage(targetWebhook: Discord.Webhook, threadId: Discord.Snowflake, sourceMessage: Discord.Message) {
    let newMessageHasSubstance = false
    let newMessage = {
        username: sourceMessage.author.username
    } as {
        username: string,
        avatarURL?: string,
        content?: string,
        threadId?: string,
        files?: Array<Discord.Attachment>,
        embeds?: Array<Discord.Embed>
    }

    if (sourceMessage.author.avatarURL() !== null) {
        newMessage.avatarURL = sourceMessage.author.avatarURL()
    }
    newMessage.threadId = threadId

    if (sourceMessage.attachments) {
        newMessage.files = []
        for (let attachment of sourceMessage.attachments.values()) {
            newMessage.files.push(attachment)
            newMessageHasSubstance = true
        }
    }
    if (sourceMessage.embeds.length > 0) {
        newMessage.embeds = sourceMessage.embeds
        newMessageHasSubstance = true
    }
    if (!sourceMessage.content && newMessageHasSubstance) {
        try {
            await targetWebhook.send(newMessage)
            return
        } catch (e) {
            console.error(e)
            return
        }
    }

    for (let splitContent of splitMessage(sourceMessage.content, 1950)) {
        if (splitContent.length > 0) {
            newMessage.content = splitContent
            try {
                await targetWebhook.send(newMessage)
                return
            } catch (e) {
                console.error(e)
                return
            }
        }
    }
}

function splitMessage(str: string, size: number): Array<string> {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size)
    }

    return chunks
}