const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DAILY_CHANNEL_ID;
const COUNTER_FILE = process.env.COUNTER_FILE || 'daycount.json';
let lastCommandAt = 0;
const QURAN_API_URL = 'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,en.asad';

const client = new Client({
  allowedMentions: { parse: [], repliedUser: false },
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

// Scheduled message every day at 3:00 PM America/Los_Angeles (DST-aware).
cron.schedule('0 15 * * *', async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return console.error('Channel not found!');

  try {
  let messageText = 'Quran verse of the day is unavailable right now.    إِنْ شَاءَ ٱللَّٰهُ';

  try {
    const verse = await fetchDailyVerse();
    messageText = `Quran verse of the day (${verse.reference})\n${verse.arabicText}\n${verse.englishText}    إِنْ شَاءَ ٱللَّٰهُ`;
  } catch (err) {
    console.error('Failed to fetch Quran verse:', err);
  }

  await channel.send({ content: messageText.length > 2000 ? messageText.slice(0, 1999) + "…" : messageText, allowedMentions: { parse: [] } });
  dayData.day += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(dayData));
  } catch (err) { console.error("Daily message failed:", err.message); }
}, {
  noOverlap: true,
  timezone: "America/Los_Angeles"
});

// Only accept the status command in the configured community channel.
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guildId || message.channelId !== CHANNEL_ID) return;
  if (message.content.trim().toLowerCase() !== '!day') return;
  const now = Date.now();
  if (now - lastCommandAt < 30000) return;
  lastCommandAt = now;
  try {
    await message.channel.send({
      content: `Bot is online and today is Day ${dayData.day}.`,
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('Status reply failed:', err.message);
  }
});

client.login(TOKEN);
