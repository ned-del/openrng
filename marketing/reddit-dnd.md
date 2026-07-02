# r/DnD Post

**Title:** I built a dice bot that can mathematically prove it didn't load your dice

---

We've all been there. You roll three nat 1s in a row. The bot is rigged. The DM is laughing. Your barbarian is dead.

But what if your dice bot could *prove* it wasn't cheating?

I built [@OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot) for Telegram. It rolls dice like any bot, but every single roll is cryptographically committed *before* you ask for it. The number already existed. The bot just reveals it.

You can `/verify` any roll and see the math. Merkle proofs, on-chain timestamps, the whole thing. It's like notarizing every dice roll with a blockchain witness.

**Commands that matter for TTRPG:**

- `/roll 1d20` — standard roll
- `/roll 1d20+5` — with modifiers (ability checks, saves, attacks)
- `/roll 4d6` — ability scores the hard way
- `/roll 2d20` — advantage/disadvantage
- `/pick fireball "eldritch blast" "run away"` — decision paralysis solved
- `/shuffle player1 player2 player3` — initiative order nobody can argue with

Works inline too — type `@OpenRNG_Dice_Bot roll 1d20` in any Telegram chat.

Next time someone says "your bot rolled me a 3 on purpose," you can send them a cryptographic proof that the number was locked in before they even typed `/roll`.

Will it fix your luck? No. But at least you'll know the universe is genuinely out to get you.

**Note:** It's a Telegram bot for now. If you want to try it alongside your Discord sessions, just drop the rolls in a Telegram side chat. Discord bot is on the roadmap.

Try it: [t.me/OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)
