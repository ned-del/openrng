/**
 * /lottery command — Pick random lottery numbers
 *
 * Usage: /lottery [count] [max]
 * Examples: /lottery (6 from 1-49), /lottery 5 90, /lottery 6 49
 */

import type { CommandContext, Context } from 'grammy';
import { getRNG } from '../rng.js';
import { formatLottery } from '../format.js';

const MAX_PICKS = 20;
const MAX_RANGE = 999;

export async function lotteryCommand(ctx: CommandContext<Context>) {
  const input = ctx.match?.toString().trim();

  let count = 6;
  let max = 49;

  if (input) {
    const parts = input.split(/\s+/);

    if (parts.length === 1) {
      count = parseInt(parts[0], 10);
    } else if (parts.length === 2) {
      count = parseInt(parts[0], 10);
      max = parseInt(parts[1], 10);
    } else {
      await ctx.reply('❌ Usage: `/lottery [count] [max]`\nExample: `/lottery 6 49`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    if (isNaN(count) || isNaN(max)) {
      await ctx.reply('❌ Both values must be numbers. Example: `/lottery 6 49`', {
        parse_mode: 'Markdown',
      });
      return;
    }
  }

  if (count < 1 || count > MAX_PICKS) {
    await ctx.reply(`❌ Pick count must be 1–${MAX_PICKS}.`);
    return;
  }

  if (max < 2 || max > MAX_RANGE) {
    await ctx.reply(`❌ Range must be 2–${MAX_RANGE}.`);
    return;
  }

  if (count > max) {
    await ctx.reply(`❌ Can't pick ${count} unique numbers from 1–${max}.`);
    return;
  }

  try {
    // Generate the full range and shuffle it, then take the first `count`
    const range = Array.from({ length: max }, (_, i) => (i + 1).toString());
    const result = await getRNG().shuffle(range);
    const picks = result.result.slice(0, count).map(Number).sort((a, b) => a - b);

    const { text, keyboard } = formatLottery(picks, max, result.proofs[0]);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Lottery error:', err);
    await ctx.reply('🎱 Oops — couldn\'t draw numbers! The RNG server might be taking a break. Try again in a moment.');
  }
}
