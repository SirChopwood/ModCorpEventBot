export type Team = {
    "id": number,
    "name": string,
    "description": string,
    "colour": string,
    "logo_url": string,
    "discord": {
        "role": string,
        "channel": string,
        "server": string,
    }
}