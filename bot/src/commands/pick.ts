/**
 * /pick command — Verifiable random choice
 *
 * Usage: /pick option1 option2 option3 ...
 */

import type { CommandContext, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { getRNG } from '../rng.js';
import { formatChoose } from '../format.js';

export async function pickCommand(ctx: CommandContext<Context>) {
  const input = ctx.match?.toString().trim();

  if (!input) {
    await ctx.reply('🤔 Give me some options! Try: `/pick pizza sushi tacos`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const items = input.split(/\s+/).filter(Boolean);

  if (items.length < 2) {
    await ctx.reply('🤔 Need at least 2 options to pick from.\nTry: `/pick pizza sushi`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  try {
    const result = await getRNG().choose(items);
    const { text, keyboard } = formatChoose(result);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Pick error:', err);

    const retryKb = new InlineKeyboard()
      .text('🔄 Try Again', 'quick:pick');

    await ctx.reply(
      '🎯 Oops — couldn\'t make a choice! The RNG server might be taking a break. Try again in a moment.',
      { reply_markup: retryKb },
    );
  }
}
