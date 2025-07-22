// @ts-ignore
import * as Discord from "discord.js";

export default class Permissions {
    constructor() {
    }

    // For owners of the bot (All perms)
    isOwner(user: Discord.GuildMember | Discord.User) {
        return JSON.parse(process.env.BOT_OWNERS!).includes(user.id)
    }

    // For those who have any role in the admin role list. (Allows most actions)
    isAdmin(user: Discord.GuildMember | Discord.User) {
        if (this.isOwner(user)) {
            return true
        }
        if (user.guild) {
            const adminRoleList = JSON.parse(process.env.BOT_ADMIN_ROLES!)
            for (const roleId of user.roles.cache.keys()) {
                if (adminRoleList.includes(roleId)) {
                    return true
                }
            }
        }
        return false
    }
}