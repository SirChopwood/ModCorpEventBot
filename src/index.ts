import DiscordBot from "./bot.js"

const bot = new DiscordBot()

bot.client.login(process.env.BOT_TOKEN);