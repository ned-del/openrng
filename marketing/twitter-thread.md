# Twitter/X Thread

---

**1/**
Every dice bot you've ever used could have lied to you.

I built one that can't.

@OpenRNG_Dice_Bot pre-commits every result before you ask — locked in with Merkle proofs, anchored on Polygon.

Here's why that matters 🧵

---

**2/**
The core problem: when a bot gives you a random number, you're trusting the server didn't just pick whatever it wanted.

"Trust me" isn't good enough. Not for games, not for giveaways, not for anything with stakes.

We need math, not trust.

---

**3/**
The pipeline:

→ VDF (Verifiable Delay Function) generates randomness using fixed sequential computation — can't be rushed
→ Combined with @daboratory drand beacon for external entropy nobody controls
→ Batched into Merkle trees
→ Roots anchored on @0xPolygon

---

**4/**
When you type /roll:

The bot picks the next pre-committed value, maps it to your dice range, and returns the result + Merkle proof.

The number was already decided. The bot just opened the envelope.

You can /verify any result against the on-chain anchor.

---

**5/**
This is live right now as @OpenRNG_Dice_Bot on Telegram.

Commands: /roll, /flip, /pick, /shuffle, /raffle, /lottery, /wheel, /teams

Works inline in any chat. Every result is verifiable.

---

**6/**
Current status — being transparent:

✅ Bot fully operational
✅ Cryptographic pipeline live
✅ Proofs anchored on Polygon Amoy (testnet)
⬜ Mainnet migration (planned)
⬜ Source code open-sourcing (in progress)

Anchor contract: 0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8

---

**7/**
No token. No ICO. No fees. No subscriptions.

Verifiable randomness should be infrastructure, not a product.

If you're building something that needs provable fairness — games, raffles, governance, drops — try the bot or reach out.

→ t.me/OpenRNG_Dice_Bot

#Polygon #OpenSource #Crypto #RNG
