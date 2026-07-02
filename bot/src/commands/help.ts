/**
 * /help and /start commands
 *
 * /start — Short welcome + live demo roll + quick-action buttons
 * /help  — Full command reference
 */

import type { CommandContext, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { getRNG } from '../rng.js';
import { truncateHash } from '../verify-url.js';

// ── Quick-action button callbacks ───────────────────────────

export const CALLBACK_QUICK_ROLL = 'quick:roll';
export const CALLBACK_QUICK_FLIP = 'quick:flip';
export const CALLBACK_QUICK_PICK = 'quick:pick';
export const CALLBACK_QUICK_HELP = 'quick:help';

// ── /start — Short intro + live demo ────────────────────────

export async function startCommand(ctx: CommandContext<Context>) {
  let demoLine: string;

  try {
    const result = await getRNG().dice(1, 6);
    const value = result.rolls[0];
    const hash = truncateHash(result.proofs[0].leafHash);
    demoLine =
      `🎲 *${value}*  ← 1d6\n` +
      `🔗 \`${hash}\`\n`;
  } catch {
    demoLine = '';
  }

  const text =
    `🎲 *I generate provably fair random numbers.*\n` +
    `Every result has a cryptographic proof.\n\n` +
    (demoLine
      ? `Here's your first verified roll:\n\n${demoLine}\n`
      : '') +
    `Tap a button to try more, or /help for all commands.\n\n` +
    `💡 _Tip:_ Use me inline! Type \`@OpenRNG\\_Dice\\_Bot roll 2d6\` in any chat.`;

  const keyboard = new InlineKeyboard()
    .text('🎲 Roll', CALLBACK_QUICK_ROLL)
    .text('🪙 Flip', CALLBACK_QUICK_FLIP)
    .text('🎯 Pick', CALLBACK_QUICK_PICK)
    .text('📋 All Commands', CALLBACK_QUICK_HELP);

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
    link_preview_options: { is_disabled: true },
  });
}

// ── /help — Full command list ───────────────────────────────

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

export async function helpCommand(ctx: CommandContext<Context>) {
  await ctx.reply(HELP_TEXT, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
}
