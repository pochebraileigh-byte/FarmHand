/**
 * Harrowsville Farm Bot
 * Gateway bot for Lighthouse Farms — reads ! commands, calls Worker API
 */

const { Client, GatewayIntentBits } = require('discord.js');

const BOT_TOKEN = process.env.DISCORD_TOKEN;
const WORKER_URL = process.env.WORKER_URL; // https://harrowsville-bot.harrowhouse.workers.dev

if (!BOT_TOKEN) { console.error('Missing DISCORD_TOKEN'); process.exit(1); }
if (!WORKER_URL) { console.error('Missing WORKER_URL'); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Command map ───────────────────────────────────────────────────────────────

const COMMANDS = new Set([
  'farm', 'farmstatus',
  'plant', 'water', 'harvest',
  'fish', 'beachsearch', 'seafish',
  'barn', 'care', 'collect',
  'shop', 'buy', 'sell', 'sellall', 'selljunk',
  'expandfarm', 'give', 'donate', 'rename',
  'inventory', 'inv',
  'help',
]);

// ── Call the Worker API ───────────────────────────────────────────────────────

async function callWorker(endpoint, method = 'POST', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${WORKER_URL}${endpoint}`, opts);
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  return res.json().catch(() => ({}));
}

// ── Message handler ───────────────────────────────────────────────────────────

client.on('messageCreate', async (message) => {
  // Debug log every message to see what we're receiving
  console.log(`MSG from ${message.author.username} (bot:${message.author.bot}) id:${message.author.id}: ${message.content}`);
  // Block Farm Hand itself to prevent loops, but allow other bots (AIs) to play
  if (message.author.id === client.user.id) return;
  if (!message.content.startsWith('!')) return;

  const parts = message.content.slice(1).trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  if (!COMMANDS.has(command)) return;

  const args = parts.slice(1);
  const channelId = message.channel.id;
  const userId = message.author.id;
  const username = message.author.username;

  try {
    console.log(`Calling worker: ${command} for ${username} in ${channelId}`);
    const result = await callWorker('/internal/command', 'POST', {
      command,
      args,
      channelId,
      userId,
      username,
    });
    console.log(`Worker response:`, JSON.stringify(result));
  } catch (e) {
    console.error(`Command error [${command}]:`, e.message);
    await message.channel.send('⚠️ Something went wrong. The farm will recover.');
  }
});

// ── Ready ─────────────────────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`🌾 Farm Hand online as ${client.user.tag}`);
  client.user.setActivity('Harrow Cove 🌾', { type: 0 }); // "Playing Harrow Cove 🌾"
});

client.login(BOT_TOKEN);
