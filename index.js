const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = '801936480539770900'; // channel where daily message is sent
const PURGE_CHANNEL_ID = '1411181026448769094'; // 🔁 replace with the channel you want to purge
const COUNTER_FILE = 'daycount.json';
const PREFIX = '!';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Handle global errors to prevent crashes
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:', reason);
});

// Load or initialize day counter
let dayData = { day: 1 };
if (fs.existsSync(COUNTER_FILE)) {
  try {
    dayData = JSON.parse(fs.readFileSync(COUNTER_FILE));
  } catch (err) {
    console.error('Error reading daycount.json:', err);
  }
}

// Scheduled message every day at 10:47 AM PST/PDT
cron.schedule('11 18 * * *', () => {
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return console.error('Channel not found!');

  channel.send(`9:11 Make a wish!! <@92072363302060032> Go workout you fat fuck!    إِنْ شَاءَ ٱللَّٰهُ`);
  dayData.day += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(dayData));
}, {
  timezone: "America/Los_Angeles"
});

// Command handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.slice(PREFIX.length).trim().toLowerCase();

  if (command === 'day') {
    message.channel.send(`✅Bot is online and today is Day ${dayData.day} <@${message.author.id}> إِنْ شَاءَ ٱللَّٰهُ `);
  }

  if (command === 'purge') {
    try {
      const targetChannel = client.channels.cache.get(PURGE_CHANNEL_ID);

      if (!targetChannel || !targetChannel.isTextBased()) {
        return await message.reply('⚠️ Target channel not found or not a text channel.');
      }

      const messages = await targetChannel.messages.fetch({ limit: 100 });
      const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      if (deletable.size === 0) {
        return await message.reply('⚠️ No messages to delete (or they’re all too old).');
      }

      await targetChannel.bulkDelete(deletable, true);
      await message.reply(`✅ Deleted ${deletable.size} messages in <#${PURGE_CHANNEL_ID}>`);
    } catch (err) {
      console.error('❌ Purge command failed:', err);
      try {
        await message.reply('❌ An error occurred while purging. Check console for details.');
      } catch (e) {
        console.error('⚠️ Failed to send error reply:', e);
      }
    }
  }
  if (command.startsWith('ping')) {
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply('⚠️ You need to mention a user to ping them!');
    }

    for (let i=0; i< 5; i++) {
      setTimeout(() => {
        message.channel.send(`<@${targetUser.id}>`);
      }, i * 500);
    }
}

});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
