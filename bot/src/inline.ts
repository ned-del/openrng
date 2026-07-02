/**
 * Inline mode handler
 *
 * Allows users to type @OpenRNG_Dice_Bot in any chat to generate
 * verifiable random results without adding the bot to the group.
 *
 * Supported queries:
 *   roll [NdN]   — Roll dice
 *   flip          — Coin flip
 *   pick a b c    — Random choice
 *   shuffle a b c — Random shuffle
 *   d20, 2d6      — Direct dice notation
 */

import type { Context } from 'grammy';
import type { InlineQueryResult } from 'grammy/types';
import { getRNG } from './rng.js';
import { truncateHash } from './verify-url.js';

const DICE_RE = /^(\d+)?d(\d+)$/i;

export async function handleInlineQuery(ctx: Context): Promise<void> {
  const query = ctx.inlineQuery?.query?.trim() || '';
  const results: InlineQueryResult[] = [];

  try {
    if (!query || query === 'help') {
      // Show available actions
      results.push(
        makeHelpResult('roll', '🎲 Roll Dice', 'Type: roll 2d6, roll d20, or just d20'),
        makeHelpResult('flip', '🪙 Flip Coin', 'Type: flip'),
        makeHelpResult('pick', '🎯 Random Pick', 'Type: pick pizza sushi tacos'),
        makeHelpResult('shuffle', '🔀 Shuffle', 'Type: shuffle Alice Bob Charlie'),
      );
    } else {
      const parts = query.split(/\s+/).filter(Boolean);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'roll' || DICE_RE.test(cmd)) {
        const diceStr = cmd === 'roll' ? (args[0] || '1d6') : cmd;
        const match = diceStr.match(DICE_RE);

        if (match) {
          const count = match[1] ? parseInt(match[1], 10) : 1;
          const sides = parseInt(match[2], 10);

          if (count >= 1 && count <= 20 && sides >= 2 && sides <= 1000) {
            const result = await getRNG().dice(count, sides);
            const proofHash = truncateHash(result.proofs[0].leafHash);

            let text: string;
            if (count === 1) {
              text = `🎲 ${count}d${sides} → ${result.rolls[0]}`;
            } else {
              text = `🎲 ${count}d${sides} → ${result.rolls.join(' + ')} = ${result.total}`;
            }

            results.push({
              type: 'article',
              id: `roll-${Date.now()}`,
              title: text,
              description: `Verified: ${proofHash}`,
              input_message_content: {
                message_text: `${text}\n🔗 \`${proofHash}\` · OpenRNG ✅`,
                parse_mode: 'Markdown',
              },
            });
          }
        }
      } else if (cmd === 'flip') {
        const result = await getRNG().flip();
        const face = result.result ? 'Heads' : 'Tails';
        const proofHash = truncateHash(result.proof.leafHash);

        results.push({
          type: 'article',
          id: `flip-${Date.now()}`,
          title: `🪙 ${face}!`,
          description: `Verified: ${proofHash}`,
          input_message_content: {
            message_text: `🪙 *${face}!*\n🔗 \`${proofHash}\` · OpenRNG ✅`,
            parse_mode: 'Markdown',
          },
        });
      } else if (cmd === 'pick' && args.length >= 2) {
        const result = await getRNG().choose(args);
        const proofHash = truncateHash(result.proof.leafHash);

        results.push({
          type: 'article',
          id: `pick-${Date.now()}`,
          title: `🎯 ${result.choice}`,
          description: `From: ${args.join(', ')} · ${proofHash}`,
          input_message_content: {
            message_text: `🎯 *${result.choice}*\n_(from ${args.join(', ')})_\n🔗 \`${proofHash}\` · OpenRNG ✅`,
            parse_mode: 'Markdown',
          },
        });
      } else if (cmd === 'shuffle' && args.length >= 2) {
        const result = await getRNG().shuffle(args);
        const proofHash = truncateHash(result.proofs[0].leafHash);
        const shuffled = result.result.join(' → ');

        results.push({
          type: 'article',
          id: `shuffle-${Date.now()}`,
          title: `🔀 ${shuffled}`,
          description: `Verified: ${proofHash}`,
          input_message_content: {
            message_text: `🔀 *Shuffled:*\n${result.result.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n🔗 \`${proofHash}\` · OpenRNG ✅`,
            parse_mode: 'Markdown',
          },
        });
      } else {
        // Unrecognized — show help
        results.push(
          makeHelpResult('hint', '💡 Try: roll 2d6, flip, pick a b c, shuffle a b c', 'Type a command to generate verified random results'),
        );
      }
    }
  } catch (err) {
    console.error('Inline query error:', err);
    results.push({
      type: 'article',
      id: `error-${Date.now()}`,
      title: '⚠️ RNG server unavailable',
      description: 'Try again in a moment',
      input_message_content: {
        message_text: '⚠️ OpenRNG server is temporarily unavailable. Try again shortly.',
      },
    });
  }

  await ctx.answerInlineQuery(results, {
    cache_time: 0, // Don't cache — each result should be unique
    is_personal: true,
  });
}

function makeHelpResult(id: string, title: string, description: string): InlineQueryResult {
  return {
    type: 'article',
    id: `help-${id}-${Date.now()}`,
    title,
    description,
    input_message_content: {
      message_text:
        `🎲 *OpenRNG Dice Bot*\n\n` +
        `Use me inline in any chat! Type \`@OpenRNG_Dice_Bot\` followed by:\n\n` +
        `• \`roll 2d6\` — Roll dice\n` +
        `• \`flip\` — Coin flip\n` +
        `• \`pick a b c\` — Random choice\n` +
        `• \`shuffle a b c\` — Shuffle items\n\n` +
        `Every result is cryptographically verified. ✅`,
      parse_mode: 'Markdown',
    },
  };
}
