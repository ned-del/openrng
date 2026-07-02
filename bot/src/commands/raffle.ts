/**
 * /raffle command — Group giveaway draw
 * /draw command — Pick winner(s) from active raffle
 *
 * Usage:
 *   /raffle Title of the giveaway
 *   /draw [N] — draw N winners (default 1, max 10)
 */

import type { CommandContext, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { getRNG } from '../rng.js';
import { formatRaffleWinner } from '../format.js';

// ── Raffle state ────────────────────────────────────────────

interface RaffleState {
  messageId: number;
  title: string;
  participants: Map<number, string>; // userId → display name
  creatorId: number;
}

/** Active raffles: one per chat */
const activeRaffles = new Map<number, RaffleState>();

const CALLBACK_JOIN = 'raffle:join';
const MAX_WINNERS = 10;

// ── /raffle command ─────────────────────────────────────────

export async function raffleCommand(ctx: CommandContext<Context>) {
  // Only in group chats
  if (ctx.chat?.type === 'private') {
    await ctx.reply('🎟️ Raffles only work in group chats. Add me to a group to use /raffle!');
    return;
  }

  const title = ctx.match?.toString().trim() || 'Raffle';

  const chatId = ctx.chat.id;

  // Replace any existing raffle in this chat
  const keyboard = new InlineKeyboard().text('🎟️ Join Raffle', CALLBACK_JOIN);

  const msg = await ctx.reply(
    `🎟️ *${escapeMarkdown(title)}*\n\n` +
    `Tap the button below to enter\\!\n` +
    `An admin can send /draw to pick winner\\(s\\)\\.`,
    {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    },
  );

  activeRaffles.set(chatId, {
    messageId: msg.message_id,
    title,
    participants: new Map(),
    creatorId: ctx.from!.id,
  });
}

// ── Join callback ───────────────────────────────────────────

export async function raffleJoinCallback(ctx: Context) {
  const chatId = ctx.callbackQuery?.message?.chat.id;
  if (!chatId) {
    await ctx.answerCallbackQuery({ text: '❌ Something went wrong.', show_alert: true });
    return;
  }

  const raffle = activeRaffles.get(chatId);
  if (!raffle) {
    await ctx.answerCallbackQuery({ text: '❌ No active raffle in this chat.', show_alert: true });
    return;
  }

  const userId = ctx.callbackQuery!.from.id;
  const userName =
    ctx.callbackQuery!.from.username
      ? `@${ctx.callbackQuery!.from.username}`
      : ctx.callbackQuery!.from.first_name;

  if (raffle.participants.has(userId)) {
    await ctx.answerCallbackQuery({ text: '✅ You already joined!', show_alert: false });
    return;
  }

  raffle.participants.set(userId, userName);

  await ctx.answerCallbackQuery({
    text: `🎟️ You're in! (${raffle.participants.size} participants)`,
    show_alert: false,
  });

  // Update the raffle message with participant count
  try {
    const keyboard = new InlineKeyboard().text(
      `🎟️ Join Raffle (${raffle.participants.size})`,
      CALLBACK_JOIN,
    );
    await ctx.api.editMessageReplyMarkup(chatId, raffle.messageId, {
      reply_markup: keyboard,
    });
  } catch {
    // Ignore edit errors (e.g. message not modified)
  }
}

// ── /draw command ───────────────────────────────────────────

export async function drawCommand(ctx: CommandContext<Context>) {
  if (ctx.chat?.type === 'private') {
    await ctx.reply('🎟️ /draw only works in group chats with an active raffle.');
    return;
  }

  const chatId = ctx.chat.id;
  const raffle = activeRaffles.get(chatId);

  if (!raffle) {
    await ctx.reply('❌ No active raffle. Start one with `/raffle Title`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  if (raffle.participants.size === 0) {
    await ctx.reply('❌ No one has joined the raffle yet!');
    return;
  }

  // Check if the user is the creator or an admin
  const userId = ctx.from!.id;
  let isAdmin = userId === raffle.creatorId;

  if (!isAdmin) {
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      isAdmin = ['administrator', 'creator'].includes(member.status);
    } catch {
      // If we can't check, only allow creator
    }
  }

  if (!isAdmin) {
    await ctx.reply('❌ Only the raffle creator or group admins can draw winners.');
    return;
  }

  // Parse winner count
  let winnerCount = 1;
  const input = ctx.match?.toString().trim();
  if (input) {
    winnerCount = parseInt(input, 10);
    if (isNaN(winnerCount) || winnerCount < 1) winnerCount = 1;
    if (winnerCount > MAX_WINNERS) winnerCount = MAX_WINNERS;
  }

  const participantNames = Array.from(raffle.participants.values());

  if (winnerCount > participantNames.length) {
    winnerCount = participantNames.length;
  }

  try {
    if (winnerCount === 1) {
      // Single winner — use choose
      const result = await getRNG().choose(participantNames);
      const { text, keyboard } = formatRaffleWinner(
        [result.choice],
        raffle.title,
        participantNames.length,
        result.proof,
      );

      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } else {
      // Multiple winners — shuffle and take first N
      const result = await getRNG().shuffle(participantNames);
      const winners = result.result.slice(0, winnerCount);
      const { text, keyboard } = formatRaffleWinner(
        winners,
        raffle.title,
        participantNames.length,
        result.proofs[0],
      );

      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

    // Clean up the raffle
    activeRaffles.delete(chatId);
  } catch (err) {
    console.error('Draw error:', err);
    await ctx.reply('🏆 Oops — couldn\'t draw a winner! The RNG server might be taking a break. Try again in a moment.');
  }
}

// ── Helpers ─────────────────────────────────────────────────

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export { CALLBACK_JOIN };
