/**
 * /verify command — Verify a past result on-chain
 *
 * Usage: /verify <leafHash>
 */

import type { CommandContext, Context } from 'grammy';
import { OpenRNG } from '@openrng/sdk';

export async function verifyCommand(ctx: CommandContext<Context>) {
  const leafHash = ctx.match?.toString().trim();

  if (!leafHash) {
    await ctx.reply('❌ Provide a proof hash: `/verify abc123...`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  try {
    const endpoint = process.env.OPENRNG_ENDPOINT || 'http://localhost:3000';

    const result = await OpenRNG.verify(
      {
        leafHash,
        merkleRoot: '',
        batchId: '',
        polygonTx: null,
        polygonScan: null,
      },
      endpoint,
    );

    let text: string;

    if (result.valid) {
      text = `✅ *Verified!*\n\nBatch: \`${result.batchId}\`\nOn-chain: ${result.onChain ? '✅ Yes' : '⏳ Pending'}`;
      if (result.polygonScan) {
        text += `\n🔗 [View on PolygonScan](${result.polygonScan})`;
      }
    } else {
      text = '❌ *Proof not found or invalid.*\n\nThe hash may be incorrect or the batch may not exist.';
    }

    await ctx.reply(text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Verify error:', err);
    await ctx.reply('🔍 Oops — couldn\'t verify right now. The RNG server might be taking a break. Try again in a moment.');
  }
}
