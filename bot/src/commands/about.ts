/**
 * /about command — Show OpenRNG's value proposition
 */

import type { CommandContext, Context } from 'grammy';

const ABOUT_TEXT = `🎲 *About OpenRNG*

OpenRNG is a verifiable random number generation platform that produces provably fair results using cryptographic proofs.

*How it works:*
1️⃣ Random entropy is generated using Verifiable Delay Functions (VDFs) and public drand beacons — *before* your request
2️⃣ Results are committed to a Merkle tree and anchored on Polygon
3️⃣ Anyone can verify that the result wasn't tampered with

*Why it matters:*
• 🔒 No one (not even us) can predict or manipulate results
• ✅ Every result comes with a cryptographic proof
• ⛓️ Proofs are anchored on-chain for permanent verification
• 🌐 Works for games, lotteries, raffles, and AI agents

*Links:*
🔗 [OpenRNG Website](https://openrng.org)
📦 [GitHub](https://github.com/openrng)

_Verifiable randomness for everyone._`;

export async function aboutCommand(ctx: CommandContext<Context>) {
  await ctx.reply(ABOUT_TEXT, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
}
