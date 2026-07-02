/**
 * /shuffle command — Verifiable random shuffle
 *
 * Usage: /shuffle item1 item2 item3 ...
 */

import type { CommandContext, Context } from 'grammy';
import { getRNG } from '../rng.js';
import { formatShuffle } from '../format.js';

export async function shuffleCommand(ctx: CommandContext<Context>) {
  const input = ctx.match?.toString().trim();

  if (!input) {
    await ctx.reply('❌ Provide items: `/shuffle Alice Bob Charlie`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const items = input.split(/\s+/).filter(Boolean);

  if (items.length < 2) {
    await ctx.reply('❌ Need at least 2 items to shuffle.');
    return;
  }

  try {
    const result = await getRNG().shuffle(items);
    const { text, keyboard } = formatShuffle(result);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Shuffle error:', err);
    await ctx.reply('🔀 Oops — couldn\'t shuffle! The RNG server might be taking a break. Try again in a moment.');
  }
}
