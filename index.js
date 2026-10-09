const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DAILY_CHANNEL_ID;
const COUNTER_FILE = 'daycount.json';
const PREFIX = '!';
const QURAN_API_URL = 'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,en.asad';

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

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

async function fetchDailyVerse() {
  const response = await fetch(QURAN_API_URL, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Quran API request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.data) || payload.data.length < 2) {
    throw new Error('Quran API response did not include both verse editions');
  }

  const [arabicVerse, englishVerse] = payload.data;
  const reference = `${englishVerse.surah.englishName} ${englishVerse.surah.number}:${englishVerse.numberInSurah}`;

  return {
    reference,
    arabicText: arabicVerse.text.replace(/\s+/g, ' ').trim(),
    englishText: englishVerse.text.replace(/\s+/g, ' ').trim(),
  };
}

// Scheduled message every day at 9:30 AM America/Los_Angeles (DST-aware).
cron.schedule('30 9 * * *', async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return console.error('Channel not found!');

  let messageText = 'Quran verse of the day is unavailable right now.    إِنْ شَاءَ ٱللَّٰهُ';

  try {
    const verse = await fetchDailyVerse();
    messageText = `Quran verse of the day (${verse.reference})\n${verse.arabicText}\n${verse.englishText}    إِنْ شَاءَ ٱللَّٰهُ`;
  } catch (err) {
    console.error('Failed to fetch Quran verse:', err);
  }

  await channel.send({ content: messageText, allowedMentions: { parse: [] } });
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
  } else if (command.startsWith('ping')) {
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply('⚠️ You need to mention a user to ping them!');
    }

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        message.channel.send(`<@${targetUser.id}>`);
      }, i * 500);
    }
  }
});

client.login(TOKEN);
