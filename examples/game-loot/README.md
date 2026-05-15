# Verifiable Game Loot — Commit-Reveal Pattern

## The Problem

A fair random number doesn't automatically mean fair loot. If the game server gets to decide *what a number means*, it can map fair numbers to unfair outcomes:

```
Fair RNG → 0.73 → Game server says "common sword"
                   (but 0.73 should have been a legendary?)
```

Players have no way to verify the mapping. The RNG is provably fair, but the interpretation isn't.

## The Solution: Public Loot Tables + Deterministic Mapping

The game publishes its loot table (with drop rates) as a **hash commitment** before any drops happen. When a player gets an item, they can verify:

1. ✅ The random number was fair (OpenRNG Merkle proof → Polygon)
2. ✅ The loot table is the one that was committed (hash match)
3. ✅ The mapping from number → item is deterministic (anyone can recompute it)

```
Published loot table hash: 0xabc123...
    ↓
OpenRNG token: 0.73 (with Merkle proof)
    ↓
Deterministic mapping: 0.73 → "Legendary Sword of Fire"
    ↓
Anyone can verify all three steps independently
```

## Unidentified Items

This is where it gets interesting. An **unidentified item** can carry its OpenRNG proof *before* being revealed:

```typescript
// Drop an unidentified item
const drop = await lootSystem.drop('world-boss-001')
// → {
//     itemId: 'item-8f3a...',
//     status: 'unidentified',
//     proof: { leafHash, batchId, polygonScan },     ← verifiable NOW
//     revealHash: '0x7c2f...',                        ← commits to the item
//   }

// Player can trade this item. The buyer can verify:
// 1. The RNG proof is real (check Polygon)
// 2. The loot table commitment is valid
// 3. The drop was generated fairly
// They just don't know WHICH item it is yet.

// Later, identify the item:
const revealed = await lootSystem.reveal(drop.itemId)
// → {
//     name: 'Legendary Sword of Fire',
//     rarity: 'legendary',
//     proof: { ...same proof... },
//     lootTableHash: '0xabc123...',
//     verifiable: true
//   }
```

No one — not the game company, not other players — could have manipulated the result. The proof existed before the reveal.

## How It Works

### 1. Game publishes a loot table

```typescript
const table = new LootTable({
  name: 'World Boss Drops v2.1',
  items: [
    { id: 'common-sword',    name: 'Iron Sword',             rarity: 'common',    weight: 50 },
    { id: 'uncommon-shield', name: 'Steel Shield',           rarity: 'uncommon',  weight: 25 },
    { id: 'rare-helm',       name: 'Dragon Helm',            rarity: 'rare',      weight: 15 },
    { id: 'epic-armor',      name: 'Shadow Plate',           rarity: 'epic',      weight: 7 },
    { id: 'legendary-sword', name: 'Legendary Sword of Fire', rarity: 'legendary', weight: 3 },
  ],
})

// Publish this hash — it commits to the exact table
console.log(table.commitment)
// → "sha256:a1b2c3d4e5f6..."

// Anyone can verify: hash(canonical JSON of items) === commitment
```

### 2. Player kills a boss → system requests OpenRNG token

```typescript
const token = await rng.number({ min: 0, max: 1 })
// → { value: 0.73, proof: { leafHash, merkleRoot, batchId, polygonScan } }
```

### 3. Deterministic mapping: token → item

```typescript
const item = table.resolve(token.value)
// 0.00–0.50 → common     (50%)
// 0.50–0.75 → uncommon   (25%)
// 0.75–0.90 → rare       (15%)
// 0.90–0.97 → epic       (7%)
// 0.97–1.00 → legendary  (3%)
//
// 0.73 → uncommon → "Steel Shield"
```

### 4. Anyone can verify the entire chain

```typescript
const verification = await table.verify(item, token.proof, rng)
// → {
//     rngValid: true,          ← OpenRNG proof checks out on Polygon
//     tableValid: true,        ← loot table matches published commitment
//     mappingValid: true,      ← token 0.73 does map to "Steel Shield"
//     polygonScan: 'https://amoy.polygonscan.com/tx/0x...'
//   }
```

## Running the Example

```bash
cd examples/game-loot
npm install
npx ts-node demo.ts
```

Requires a running OpenRNG server (local or `api.openrng.io`).

## Why This Matters

| Without commit-reveal | With commit-reveal |
|---|---|
| "Trust us, the drop was fair" | Mathematical proof the drop was fair |
| Game company can shadow-nerf rates | Rate changes require new published commitment |
| Trading unidentified items = blind trust | Buyers can verify the RNG proof before trading |
| Disputes are he-said-she-said | Disputes are settled by math |

## Limitations

- The loot table must be **published before drops**. If the game changes drop rates, it must publish a new commitment.
- This proves the *mapping* is fair, not that the *game design* is balanced. A game with 0.001% legendary rates is provably fair — just stingy.
- Server-side reveals require trusting the server to actually reveal (not withhold). For full trustlessness, the reveal would need to be on-chain too.
