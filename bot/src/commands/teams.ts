/**
 * /teams command — Random team split
 *
 * Usage: /teams N player1 player2 player3 ...
 */

import type { CommandContext, Context } from 'grammy';
import { getRNG } from '../rng.js';
import { formatTeams } from '../format.js';

const MIN_TEAMS = 2;
const MAX_TEAMS = 10;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 100;

export async function teamsCommand(ctx: CommandContext<Context>) {
  const input = ctx.match?.toString().trim();

  if (!input) {
    await ctx.reply(
      '❌ Usage: `/teams N player1 player2 ...`\nExample: `/teams 2 Alice Bob Charlie Dave`',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const parts = input.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    await ctx.reply(
      '❌ Provide the number of teams and at least 2 players.\nExample: `/teams 2 Alice Bob Charlie`',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const teamCount = parseInt(parts[0], 10);
  const players = parts.slice(1);

  if (isNaN(teamCount)) {
    await ctx.reply('❌ First argument must be the number of teams. Example: `/teams 2 Alice Bob`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  if (teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
    await ctx.reply(`❌ Team count must be ${MIN_TEAMS}–${MAX_TEAMS}.`);
    return;
  }

  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    await ctx.reply(`❌ Player count must be ${MIN_PLAYERS}–${MAX_PLAYERS}.`);
    return;
  }

  if (teamCount > players.length) {
    await ctx.reply(`❌ Can't make ${teamCount} teams with only ${players.length} players.`);
    return;
  }

  try {
    const result = await getRNG().shuffle(players);

    // Round-robin distribution into teams
    const teams: string[][] = Array.from({ length: teamCount }, () => []);
    result.result.forEach((player, i) => {
      teams[i % teamCount].push(player);
    });

    const { text, keyboard } = formatTeams(teams, result.proofs[0]);

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Teams error:', err);
    await ctx.reply('👥 Oops — couldn\'t form teams! The RNG server might be taking a break. Try again in a moment.');
  }
}
