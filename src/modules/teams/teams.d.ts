export type Team = {
    "id": number,
    "name": string,
    "description": string,
    "colour": string,
    "logo_url": string,
    "score": number,
    "discord": {
        "role": string,
        "channel": string,
        "server": string,
    }
}