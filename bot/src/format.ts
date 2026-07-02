/**
 * Format RNG results for Telegram messages
 */

import type { Proof, DiceResult, FlipResult, ChooseResult, ShuffleResult } from '@openrng/sdk';
import { InlineKeyboard } from 'grammy';
import { getVerifyUrl, getVerifyText, truncateHash } from './verify-url.js';

// ── Verify keyboard ────────────────────────────────────────

/** Build inline keyboard with verify button */
export function verifyKeyboard(proof: Proof): InlineKeyboard {
  const url = getVerifyUrl(proof);
  const kb = new InlineKeyboard();

  if (url) {
    kb.url('✅ Verified on Polygon ↗', url);
  } else {
    kb.text('✅ Show Proof', `proof:${proof.leafHash.slice(0, 56)}`);
  }

  return kb;
}

/** Proof footer line — honest testnet label when pending/null */
function proofLine(proof: Proof): string {
  const hash = truncateHash(proof.leafHash);
  const url = getVerifyUrl(proof);
  if (url) {
    return `🔗 \`${hash}\``;
  }
  // No verified URL yet — be honest about testnet
  return `🔗 \`${hash}\` · _Polygon Amoy Testnet_`;
}

/** Get full proof text for callback display */
export { getVerifyText };

// ── Delight / flavor text ───────────────────────────────────

/** Check for special roll results and return flavor text */
function diceFlavorText(rolls: number[], sides: number): string {
  const count = rolls.length;

  // Single die specials
  if (count === 1 && sides === 20) {
    if (rolls[0] === 20) return '\n🎉 *NAT 20!* Critical hit!';
    if (rolls[0] === 1) return '\n💀 *NAT 1!* Critical fail...';
  }

  // 2d6 specials
  if (count === 2 && sides === 6) {
    if (rolls[0] === 1 && rolls[1] === 1) return '\n🐍 *Snake eyes!*';
    if (rolls[0] === 6 && rolls[1] === 6) return '\n🎰 *Boxcars!* Double sixes!';
  }

  // All dice show maximum value
  if (rolls.every(r => r === sides)) {
    return '\n🔥 *PERFECT ROLL!*';
  }

  // All same (3+ dice)
  if (count >= 3 && rolls.every(r => r === rolls[0])) {
    return '\n👀 *All matching!*';
  }

  return '';
}

// ── Coin flip flavor text ───────────────────────────────────

const HEADS_FLAVOR = [
  '🪙 *Heads!* The coin knows.',
  '🪙 *Heads!* Destiny has spoken.',
  '🪙 *Heads!* Bold choice, universe.',
  '🪙 *Heads!* As the coin commands.',
  '🪙 *Heads!* No take-backsies.',
];

const TAILS_FLAVOR = [
  '🪙 *Tails!* Fate flips your way.',
  '🪙 *Tails!* The other side wins.',
  '🪙 *Tails!* Trust the flip.',
  '🪙 *Tails!* So it was written.',
  '🪙 *Tails!* Can\'t argue with cryptography.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Formatters ──────────────────────────────────────────────

/** Format a dice roll result (with optional modifier) */
export function formatDice(
  result: DiceResult,
  count: number,
  sides: number,
  modifier = 0,
) {
  let text: string;

  if (count === 1) {
    const roll = result.rolls[0];
    if (modifier !== 0) {
      const sign = modifier > 0 ? '+' : '';
      const modifiedTotal = roll + modifier;
      text = `🎲 *${roll}* (${sign}${modifier}) → *${modifiedTotal}*`;
    } else {
      text = `🎲 *${roll}*`;
    }
  } else {
    const dice = result.rolls.map(r => `🎲 ${r}`).join(' + ');
    if (modifier !== 0) {
      const sign = modifier > 0 ? '+' : '';
      const modifiedTotal = result.total + modifier;
      text = `${dice} = *${result.total}* (${sign}${modifier}) → *${modifiedTotal}*`;
    } else {
      text = `${dice} = *${result.total}*`;
    }
  }

  // Add delight flavor text
  text += diceFlavorText(result.rolls, sides);

  text += `\n${proofLine(result.proofs[0])}`;

  return {
    text,
    keyboard: verifyKeyboard(result.proofs[0]),
  };
}

/** Format a coin flip result (with flavor text variety) */
export function formatFlip(result: FlipResult) {
  const isHeads = result.result;
  const flavor = isHeads ? pickRandom(HEADS_FLAVOR) : pickRandom(TAILS_FLAVOR);
  const text = `${flavor}\n${proofLine(result.proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(result.proof),
  };
}

/** Format a random choice result */
export function formatChoose(result: ChooseResult<string>) {
  const text = `🎯 *${result.choice}*\n${proofLine(result.proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(result.proof),
  };
}

/** Format a shuffle result */
export function formatShuffle(result: ShuffleResult<string>) {
  const list = result.result
    .map((item, i) => `${i + 1}. ${item}`)
    .join('\n');

  const proof = result.proofs[0];
  const text = `🔀 *Shuffled:*\n${list}\n\n${proofLine(proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(proof),
  };
}

/** Format lottery numbers with aligned padding */
export function formatLottery(picks: number[], max: number, proof: Proof) {
  const maxWidth = String(max).length;
  const padded = picks.map(n => String(n).padStart(maxWidth, ' '));
  const nums = maxWidth > 1
    ? '`' + padded.join(' · ') + '`'
    : padded.join(' · ');
  const text = `🎱 ${nums}\n_(${picks.length} from 1–${max})_\n\n${proofLine(proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(proof),
  };
}

/** Format wheel spin result */
export function formatWheel(result: ChooseResult<string>, options: string[]) {
  const items = options
    .map(opt => opt === result.choice ? `▸ *${opt}* 🎯` : `  ${opt}`)
    .join('\n');

  const text = `🎯 *${result.choice}!*\n\n${items}\n\n${proofLine(result.proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(result.proof),
  };
}

/** Format team split result */
export function formatTeams(teams: string[][], proof: Proof) {
  const list = teams
    .map((team, i) => `*Team ${i + 1}:* ${team.join(', ')}`)
    .join('\n');

  const text = `👥 *Teams (shuffled):*\n\n${list}\n\n${proofLine(proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(proof),
  };
}

/** Format raffle winner(s) */
export function formatRaffleWinner(
  winners: string[],
  title: string,
  totalParticipants: number,
  proof: Proof,
) {
  let text: string;

  if (winners.length === 1) {
    text = `🏆 *${winners[0]}* wins!\n🎟️ _${title}_ (${totalParticipants} participants)`;
  } else {
    const winnerList = winners.map((w, i) => `${i + 1}. ${w}`).join('\n');
    text = `🏆 *Winners!*\n${winnerList}\n\n🎟️ _${title}_ (${totalParticipants} participants)`;
  }

  text += `\n\n${proofLine(proof)}`;

  return {
    text,
    keyboard: verifyKeyboard(proof),
  };
}
