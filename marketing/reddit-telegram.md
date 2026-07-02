# r/Telegram Post

**Title:** I built a provably fair dice bot — every roll is committed before you ask

---

I've been working on a Telegram bot that generates random numbers in a way that's actually verifiable. Not "trust me" verifiable — cryptographically provable.

**The bot:** [@OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)

**What it does:**

- `/roll` — Roll dice (any sides, any count)
- `/flip` — Coin flip
- `/pick` — Pick from a list
- `/shuffle` — Randomize a list
- `/raffle` — Fair giveaway draws
- `/lottery` — Number draws
- `/wheel` — Spin the wheel
- `/teams` — Split people into teams

Works inline too — type `@OpenRNG_Dice_Bot` in any chat.

**Why it's different:**

Most dice bots generate a number when you ask. You just... trust them. OpenRNG doesn't work that way.

The numbers are generated *before* you ask. Here's the pipeline:

1. **VDF (Verifiable Delay Function)** computes randomness that takes a fixed amount of real time — can't be rushed or faked
2. **drand** public randomness beacon provides an external entropy source
3. Results get batched into a **Merkle tree**
4. The Merkle root is **anchored on Polygon Amoy (testnet)** — timestamped on-chain

When you `/roll`, the bot reveals a pre-committed value. You can `/verify` any result and check the on-chain proof yourself.

**Where it's at right now:**

This is a working testnet build. The cryptographic pipeline is fully operational — VDF computation, drand integration, Merkle tree batching, and on-chain anchoring are all live on Polygon Amoy testnet. Mainnet migration is planned once we've accumulated enough production hours and community testing.

The code will be fully open-sourced once it's cleaned up for public consumption. Right now, you can try the bot and verify every result yourself.

**Why I built this:**

I run a few group chats where we do game nights, picks, and occasional giveaways. Every time someone says "that roll was rigged" — even as a joke — I thought, why *can't* we prove it wasn't?

So I built a bot where you literally can.

**→ Try it:** [t.me/OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)

Happy to answer questions about the cryptographic pipeline or take feedback on the bot.
