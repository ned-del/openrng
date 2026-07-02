/**
 * /roll command — Roll dice with verifiable randomness
 *
 * Usage: /roll [NdN[+/-modifier]]
 * Examples: /roll 2d6, /roll d20, /roll 2d6+5, /roll d20-2, /roll (defaults to 1d6)
 */

import type { CommandContext, Context } from 'grammy';
import { getRNG } from '../rng.js';
import { formatDice } from '../format.js';
import { InlineKeyboard } from 'grammy';

const DICE_RE = /^(\d+)?d(\d+)([+-]\d+)?$/i;
const MAX_DICE = 100;
const MAX_SIDES = 1000;

/** Telegram's native dice emoji maps to d6 — use it for flair */
const NATIVE_DICE_SIDES = 6;

export async function rollCommand(ctx: CommandContext<Context>) {
  const input = ctx.match?.toString().trim();

  let count = 1;
  let sides = 6;
  let modifier = 0;

  if (input) {
    const match = input.match(DICE_RE);
    if (!match) {
      const retryKb = new InlineKeyboard()
        .text('🎲 Roll d6', 'quick:roll');

      await ctx.reply(
        `🤔 I didn't quite get that. Try: \`/roll 2d6\` or \`/roll d20+5\``,
        { parse_mode: 'Markdown', reply_markup: retryKb },
      );
      return;
    }

    count = match[1] ? parseInt(match[1], 10) : 1;
    sides = parseInt(match[2], 10);
    modifier = match[3] ? parseInt(match[3], 10) : 0;

    if (count < 1 || count > MAX_DICE) {
      await ctx.reply(
        `❌ Too many dice! Max is ${MAX_DICE} at once.\nTry: \`/roll ${MAX_DICE}d${sides}\` for maximum chaos.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (sides < 2 || sides > MAX_SIDES) {
      await ctx.reply(
        `❌ Sides must be 2–${MAX_SIDES}.\nTry: \`/roll ${count}d20\``,
        { parse_mode: 'Markdown' },
      );
      return;
    }
  }

  try {
    const result = await getRNG().dice(count, sides);
    const { text, keyboard } = formatDice(result, count, sides, modifier);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Roll error:', err);

    const retryKb = new InlineKeyboard()
      .text('🔄 Try Again', 'quick:roll');

    await ctx.reply(
      '🎲 Oops — the dice got stuck! The RNG server might be taking a break. Try again in a moment.',
      { reply_markup: retryKb },
    );
  }
}
