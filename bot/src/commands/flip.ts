/**
 * /flip command — Verifiable coin flip
 */

import type { CommandContext, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { getRNG } from '../rng.js';
import { formatFlip } from '../format.js';

export async function flipCommand(ctx: CommandContext<Context>) {
  try {
    const result = await getRNG().flip();
    const { text, keyboard } = formatFlip(result);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Flip error:', err);

    const retryKb = new InlineKeyboard()
      .text('🔄 Try Again', 'quick:flip');

    await ctx.reply(
      '🪙 Oops — the coin slipped! The RNG server might be taking a break. Try again in a moment.',
      { reply_markup: retryKb },
    );
  }
}
