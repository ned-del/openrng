# r/gamedev Post

**Title:** Free provably fair RNG for game prototypes — Telegram bot + self-hostable source

---

Built an open-source RNG system that generates verifiable random numbers — packaged as a Telegram bot you can try right now, with source code you can clone and self-host.

**Why this might be useful for gamedev:**

If you're prototyping multiplayer games, running playtests on Telegram/Discord, or building anything where players accuse you of rigging the RNG (they always do), this gives you cryptographic proof that the numbers are fair.

**The Telegram bot:** [@OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)

Quick commands for playtesting:
- `/roll 2d20` — Roll dice, any configuration
- `/pick option1 option2 option3` — Random selection
- `/shuffle player1 player2 player3` — Randomize order (turn order, draft picks)
- `/teams 2 alice bob carol dave` — Split into balanced teams
- `/lottery 6 1-49` — Draw N numbers from a range
- `/wheel` — Spin a weighted wheel

Every result is verifiable via `/verify`.

**For your own projects:**

The source code is being prepared for open-source release. If you want to integrate verifiable RNG into your game server, you'll be able to clone the repo and self-host the full pipeline. Interested devs can reach out — happy to share early access to the codebase.

**How it works (short version):**

Numbers are pre-generated using VDFs (Verifiable Delay Functions) combined with drand public randomness. They're batched into Merkle trees and anchored on Polygon Amoy (testnet). When you request a number, you get a value that was committed *before* you asked — with an on-chain proof.

No API keys needed for the bot. The full system is free and will be open source.

**Good for:**
- Game jam prototypes needing fair randomness
- Telegram-based idle/RPG games
- Playtesting sessions where turn order matters
- Any multiplayer context where "the RNG hates me" comes up
- Auditable drop rate testing

**Current status:** The bot is fully live with real cryptographic proofs on Polygon Amoy testnet. Source code open-sourcing is in progress.

**→ Try it:** [t.me/OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)

Feedback welcome — especially on what features would be most useful for game integration.
