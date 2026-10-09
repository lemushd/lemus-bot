const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness() {
  const sent = []; let handler, job, schedule, clientOptions;
  const channel = { send: async (message) => sent.push(message) };
  const client = { once() {}, on(name, fn) { handler = fn; }, login() {}, channels: { cache: { get: () => channel } } };
  vm.runInNewContext(fs.readFileSync('index.js', 'utf8'), {
    require(name) {
      if (name === 'discord.js') return { Client: function (opts) { clientOptions = opts; return client; }, GatewayIntentBits: {} };
      if (name === 'node-cron') return { schedule(rule, fn, opts) { schedule = { rule, opts }; job = fn; } };
      if (name === 'dotenv') return { config() {} };
      if (name === 'fs') return { existsSync: () => false, writeFileSync() {} };
      throw Error(name);
    },
    process: { env: { DAILY_CHANNEL_ID: 'daily' }, on() {} }, console, AbortSignal,
    fetch: async () => ({ ok: true, json: async () => ({ data: [
      { text: '@everyone ' + 'a'.repeat(2100) },
      { text: 'Translation', surah: { englishName: 'Example', number: 1 }, numberInSurah: 1 }
    ] }) })
  });
  return { sent, handler, job, schedule, clientOptions, channel };
}
test('commands cannot mass-mention, delete messages, or spam status', async () => {
  const h = harness();
  const message = (content, extra = {}) => ({ content, author: { bot: false }, guildId: 'guild', channelId: 'daily', channel: h.channel, ...extra });
  for (const content of ['!ping @everyone', '!purge']) await h.handler(message(content));
  await h.handler(message('!day', { channelId: 'other' }));
  await h.handler(message('!day', { guildId: null }));
  assert.equal(h.sent.length, 0);
  await h.handler(message('!day')); await h.handler(message('!day'));
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].allowedMentions.parse.length, 0);
  assert.equal(h.clientOptions.allowedMentions.parse.length, 0);
});
test('daily quote keeps schedule, blocks mentions, and respects message limit', async () => {
  const h = harness(); await h.job();
  assert.equal(h.schedule.rule, '0 15 * * *');
  assert.equal(h.schedule.opts.timezone, 'America/Los_Angeles');
  assert.equal(h.schedule.opts.noOverlap, true);
  assert.equal(h.sent[0].allowedMentions.parse.length, 0);
  assert(h.sent[0].content.length <= 2000);
});
