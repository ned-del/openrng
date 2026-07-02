/**
 * /wheel command — Spin the wheel
 *
 * Usage: /wheel option1 option2 option3 ...
 */

import type { CommandContext, Context } from 'grammy';
import { getRNG } from '../rng.js';
import { formatWheel } from '../format.js';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;
const SPIN_DELAY_MS = 1500;

export async function wheelCommand(ctx: CommandContext<Context>) {
  const input = ctx.match?.toString().trim();

  if (!input) {
    await ctx.reply('🤔 Give me some options! Try: `/wheel pizza sushi tacos`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const options = input.split(/\s+/).filter(Boolean);

  if (options.length < MIN_OPTIONS) {
    await ctx.reply(`🤔 Need at least ${MIN_OPTIONS} options to spin.\nTry: \`/wheel pizza sushi tacos\``);

    return;
  }

  if (options.length > MAX_OPTIONS) {
    await ctx.reply(`🤔 That's too many options — max is ${MAX_OPTIONS}.`);
    return;
  }

  try {
    // Send the spinning message first
    const spinMsg = await ctx.reply('🎰 *Spinning the wheel...*', {
      parse_mode: 'Markdown',
    });

    // Generate the result
    const result = await getRNG().choose(options);

    // Wait for the dramatic effect
    await new Promise(resolve => setTimeout(resolve, SPIN_DELAY_MS));

    // Edit with the result
    const { text, keyboard } = formatWheel(result, options);

    await ctx.api.editMessageText(
      spinMsg.chat.id,
      spinMsg.message_id,
      text,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    );
  } catch (err) {
    console.error('Wheel error:', err);
    await ctx.reply('🎡 Oops — the wheel jammed! The RNG server might be taking a break. Try again in a moment.');
  }
}
