# LemusBot

A self-hosted Discord bot that posts a daily Quran verse in Arabic and English at 9:30 AM America/Los_Angeles.

## Configuration

Install a supported Node.js LTS version, run `npm ci --ignore-scripts`, and copy `.env.example` to a private `.env` file. Set the Discord token and daily channel ID. Never commit credentials. `COUNTER_FILE` can point to a writable data directory outside the code checkout.

The only interactive command is `!day`, restricted to the configured server channel with a 30-second cooldown. All outbound mentions are disabled. The bot does not include purge or repeated-ping commands.

## Deployment and security

GitHub Actions runs checks on GitHub-hosted runners only. There is no automatic deployment into the home network. After reviewing a commit, deploy it manually over the existing trusted SSH connection, install locked dependencies with `npm ci --omit=dev --ignore-scripts`, run the tests, and restart the bot service. Keep runtime secrets and writable state outside version control. Run the service as a dedicated unprivileged user.

Give the Discord bot only View Channel and Send Messages in its intended channel. It does not need Administrator, Manage Messages, or Mention Everyone. Enable Message Content Intent only for the `!day` command. Keep your Discord and GitHub accounts protected with two-factor authentication. Never approve an unfamiliar workflow or merge unreviewed code.

If a real token is ever published, reset it in the Discord Developer Portal and update the server's private configuration. Removing it from the latest commit does not revoke it.

## Checks

`npm test` checks command restrictions, mention suppression, scheduling, and message limits without connecting to Discord. `npm audit --omit=dev` checks dependencies for known advisories. Passing checks does not guarantee that software is free of vulnerabilities.
