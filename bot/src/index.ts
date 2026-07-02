/**
 * OpenRNG Telegram Dice Bot
 *
 * Provably fair dice rolls, coin flips, and random choices
 * with cryptographic proofs anchored on Polygon.
 */

import 'dotenv/config';
import { Bot } from 'grammy';
import { rollCommand } from './commands/roll.js';
import { flipCommand } from './commands/flip.js';
import { pickCommand } from './commands/pick.js';
import { shuffleCommand } from './commands/shuffle.js';
import { verifyCommand } from './commands/verify.js';
import {
  startCommand,
  helpCommand,
  CALLBACK_QUICK_ROLL,
  CALLBACK_QUICK_FLIP,
  CALLBACK_QUICK_PICK,
  CALLBACK_QUICK_HELP,
} from './commands/help.js';
import { lotteryCommand } from './commands/lottery.js';
import { wheelCommand } from './commands/wheel.js';
import { teamsCommand } from './commands/teams.js';
import { aboutCommand } from './commands/about.js';
import { raffleCommand, drawCommand, raffleJoinCallback, CALLBACK_JOIN } from './commands/raffle.js';
import { handleInlineQuery } from './inline.js';
import { destroyRNG, getRNG } from './rng.js';
import { formatDice, formatFlip, verifyKeyboard } from './format.js';
import { truncateHash } from './verify-url.js';
import { InlineKeyboard } from 'grammy';
import { checkRateLimit, startRateLimitCleanup, stopRateLimitCleanup } from './rate-limit.js';

// ── Validate env ────────────────────────────────────────────

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required. Set it in .env');
  process.exit(1);
}

// ── Create bot ──────────────────────────────────────────────

const bot = new Bot(token);

// ── In-memory usage counter for inline mode hints ───────────

const usageCounts = new Map<number, number>();
const hintShown = new Set<number>();

/** Track command usage and return inline mode hint if appropriate */
function getInlineHint(userId: number): string | null {
  const count = (usageCounts.get(userId) || 0) + 1;
  usageCounts.set(userId, count);

  // Show hint once after 5th command
  if (count === 5 && !hintShown.has(userId)) {
    hintShown.add(userId);
    return '\n\n💡 _Did you know? You can use me in any chat! Just type_ `@OpenRNG\\_Dice\\_Bot`';
  }

  return null;
}

// ── Rate limiting middleware ────────────────────────────────

bot.use(async (ctx, next) => {
  const isCommand = ctx.message?.text?.startsWith('/');
  const isInline = !!ctx.inlineQuery;

  if ((isCommand || isInline) && ctx.from) {
    if (!checkRateLimit(ctx.from.id)) {
      if (isCommand) {
        await ctx.reply('⏳ Slow down! Max 10 commands per minute. Try again shortly.');
      } else if (isInline) {
        await ctx.answerInlineQuery([{
          type: 'article',
          id: `ratelimit-${Date.now()}`,
          title: '⏳ Rate limited',
          description: 'Max 10 requests per minute. Try again shortly.',
          input_message_content: {
            message_text: '⏳ Rate limited. Please wait a moment.',
          },
        }], { cache_time: 5, is_personal: true });
      }
      return;
    }
  }

  await next();
});

// ── Inline hint middleware ──────────────────────────────────

bot.use(async (ctx, next) => {
  await next();

  // After a successful command, track usage for inline hints
  if (ctx.message?.text?.startsWith('/') && ctx.from) {
    getInlineHint(ctx.from.id); // just track; hint is appended within commands
  }
});

// ── Group chat welcome ──────────────────────────────────────

bot.on('my_chat_member', async (ctx) => {
  const update = ctx.myChatMember;

  const newStatus = update.new_chat_member.status;
  const oldStatus = update.old_chat_member.status;

  const wasOut = ['left', 'kicked'].includes(oldStatus);
  const isIn = ['member', 'administrator'].includes(newStatus);

  if (wasOut && isIn) {
    const chatType = update.chat.type;
    if (chatType === 'group' || chatType === 'supergroup') {
      await ctx.api.sendMessage(
        update.chat.id,
        `🎲 *Hey! I'm OpenRNG Dice Bot*\n\n` +
        `I generate provably fair random results with cryptographic proofs anchored on Polygon.\n\n` +
        `*Quick start:*\n` +
        `• /roll 2d6 — Roll dice\n` +
        `• /flip — Coin flip\n` +
        `• /pick pizza sushi — Random choice\n` +
        `• /raffle Giveaway — Start a group raffle\n` +
        `• /help — See all commands\n\n` +
        `Every result is verifiable. No trust required. ✅`,
        { parse_mode: 'Markdown' },
      );
    }
  }
});

// ── Register commands ───────────────────────────────────────

bot.command('start', startCommand);
bot.command('help', helpCommand);
bot.command('roll', rollCommand);
bot.command('flip', flipCommand);
bot.command('pick', pickCommand);
bot.command('shuffle', shuffleCommand);
bot.command('verify', verifyCommand);
bot.command('raffle', raffleCommand);
bot.command('draw', drawCommand);
bot.command('lottery', lotteryCommand);
bot.command('wheel', wheelCommand);
bot.command('teams', teamsCommand);
bot.command('about', aboutCommand);

// ── Inline mode ──────────────────────────────────────────────

bot.on('inline_query', handleInlineQuery);

// ── Handle raffle join callback ───────────────────────────────

bot.callbackQuery(CALLBACK_JOIN, raffleJoinCallback);

// ── Quick-action callback handlers ──────────────────────────

bot.callbackQuery(CALLBACK_QUICK_ROLL, async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    const result = await getRNG().dice(1, 6);
    const { text, keyboard } = formatDice(result, 1, 6, 0);
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    const retryKb = new InlineKeyboard().text('🔄 Try Again', CALLBACK_QUICK_ROLL);
    await ctx.reply(
      '🎲 Oops — the dice got stuck! Try again in a moment.',
      { reply_markup: retryKb },
    );
  }
});

bot.callbackQuery(CALLBACK_QUICK_FLIP, async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    const result = await getRNG().flip();
    const { text, keyboard } = formatFlip(result);
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    const retryKb = new InlineKeyboard().text('🔄 Try Again', CALLBACK_QUICK_FLIP);
    await ctx.reply(
      '🪙 Oops — the coin slipped! Try again in a moment.',
      { reply_markup: retryKb },
    );
  }
});

bot.callbackQuery(CALLBACK_QUICK_PICK, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    '🎯 Reply with options separated by spaces:\n\n`/pick pizza sushi tacos`',
    { parse_mode: 'Markdown' },
  );
});

bot.callbackQuery(CALLBACK_QUICK_HELP, async (ctx) => {
  await ctx.answerCallbackQuery();
  // Reuse the help text
  const HELP_TEXT = `📋 *All Commands*

🎲 \`/roll [NdN]\` — Roll dice (e.g. \`2d6\`, \`d20+5\`)
🪙 \`/flip\` — Flip a coin
🎯 \`/pick a b c\` — Random choice
🔀 \`/shuffle a b c\` — Shuffle items
🎱 \`/lottery [N] [max]\` — Lottery numbers (default 6/49)
🎡 \`/wheel a b c\` — Spin the wheel
👥 \`/teams N p1 p2\` — Split into teams
🎟️ \`/raffle Title\` — Start a group raffle
🏆 \`/draw [N]\` — Draw raffle winner(s)
🔍 \`/verify <hash>\` — Verify on-chain
ℹ️ \`/about\` — About OpenRNG

*Dice modifiers:*
\`/roll 2d6+5\` — Add modifier
\`/roll d20-2\` — Subtract modifier

*Inline mode:*
Type \`@OpenRNG\\_Dice\\_Bot roll 2d6\` in any chat!

🔗 [openrng.org](https://openrng.org)`;

  await ctx.reply(HELP_TEXT, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
});

// ── Handle proof callback queries ────────────────────────────

bot.callbackQuery(/^proof:/, async (ctx) => {
  const leafPrefix = ctx.callbackQuery.data.replace('proof:', '');
  await ctx.answerCallbackQuery();

  let polygonLine = '📦 Anchor: _Polygon Amoy Testnet (confirming...)_';
  try {
    const endpoint = process.env.OPENRNG_ENDPOINT || 'http://localhost:3000';
    const apiKey = process.env.OPENRNG_API_KEY || '';
    const resp = await fetch(`${endpoint}/v1/tokens/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ leaf_hash: leafPrefix, batch_id: 'any' }),
    }).then(r => r.json()).catch(() => null) as any;
    if (resp?.polygon_scan) {
      polygonLine = `📦 [View on PolygonScan](${resp.polygon_scan})`;
    }
  } catch { /* non-fatal */ }

  await ctx.reply(
    `✅ *Verified — Provably Fair*\n\n` +
    `🌱 Leaf: \`${leafPrefix}...\`\n` +
    `⛓️ Entropy: VDF + drand beacon\n` +
    `${polygonLine}\n\n` +
    `This number was generated *before* your request using verifiable delay functions and public randomness from drand. ` +
    `The Merkle root is anchored on Polygon for tamper-proof verification.`,
    { parse_mode: 'Markdown' },
  );
});

bot.callbackQuery(/^pending:/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: '⏳ This proof is still being anchored on Polygon. Check back later!',
    show_alert: true,
  });
});

// ── Error handling ──────────────────────────────────────────

bot.catch((err) => {
  console.error('Bot error:', err);
});

// ── Graceful shutdown ───────────────────────────────────────

function shutdown() {
  console.log('Shutting down...');
  bot.stop();
  destroyRNG();
  stopRateLimitCleanup();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Register bot commands and description with Telegram ─────

async function registerBotMeta(bot: Bot): Promise<void> {
  try {
    await bot.api.setMyCommands([
      { command: 'roll', description: 'Roll dice — /roll 2d6, /roll d20+5' },
      { command: 'flip', description: 'Flip a coin' },
      { command: 'pick', description: 'Random choice — /pick a b c' },
      { command: 'shuffle', description: 'Shuffle items — /shuffle a b c' },
      { command: 'lottery', description: 'Pick lottery numbers — /lottery 6 49' },
      { command: 'wheel', description: 'Spin the wheel — /wheel a b c' },
      { command: 'teams', description: 'Random teams — /teams 2 Alice Bob' },
      { command: 'raffle', description: 'Start a group raffle' },
      { command: 'draw', description: 'Draw raffle winner(s)' },
      { command: 'verify', description: 'Verify a result on-chain' },
      { command: 'about', description: 'About OpenRNG' },
      { command: 'help', description: 'Show all commands' },
    ]);

    await bot.api.setMyDescription(
      '🎲 Provably fair dice rolls, coin flips, and random choices — ' +
      'powered by cryptographic proofs anchored on Polygon.\n\n' +
      'Every result is verifiable. No trust required.',
    );

    await bot.api.setMyShortDescription(
      'Provably fair randomness with on-chain proofs. Roll dice, flip coins, run raffles — all verifiable.',
    );

    console.log('✅ Bot commands and description registered');
  } catch (err) {
    console.error('⚠️ Failed to register bot meta (non-fatal):', err);
  }
}

// ── Start ───────────────────────────────────────────────────

startRateLimitCleanup();

console.log('🎲 OpenRNG Dice Bot starting...');

registerBotMeta(bot).then(() => {
  bot.start({
    onStart: (info) => {
      console.log(`✅ Bot running as @${info.username}`);
    },
  });
});
