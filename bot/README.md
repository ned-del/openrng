<p align="center">
  <img src="https://openrng.org/logo.svg" alt="OpenRNG" width="120" />
  <br />
  <strong>OpenRNG Dice Bot</strong>
  <br />
  Provably fair dice rolls, coin flips, and raffles for Telegram — verified on Polygon.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://telegram.org"><img src="https://img.shields.io/badge/Platform-Telegram-26A5E4?logo=telegram&logoColor=white" alt="Platform: Telegram" /></a>
  <a href="https://polygon.technology"><img src="https://img.shields.io/badge/Blockchain-Polygon-7B3FE4?logo=polygon&logoColor=white" alt="Blockchain: Polygon" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://grammy.dev"><img src="https://img.shields.io/badge/Built_with-grammY-009DC4" alt="grammY" /></a>
</p>

---

Every random result this bot produces comes with a cryptographic proof anchored on Polygon. No trust required — verify everything.

<p align="center">
  <!-- TODO: Add screenshots -->
  <em>Screenshots coming soon</em>
</p>

## ✨ Features

- 🎲 **Dice Rolls** — Standard notation (`2d6`, `d20`, `3d8`) with full proof
- 🪙 **Coin Flips** — Heads or tails, cryptographically guaranteed
- 🎯 **Random Pick** — Choose from any list of options
- 🔀 **Shuffle** — Randomize the order of items
- 🎰 **Lottery** — Pick lottery numbers (configurable count and range)
- 🎡 **Spin the Wheel** — Animated wheel spinner with results
- 👥 **Team Splitter** — Divide players into balanced random teams
- 🎟️ **Group Raffles** — Interactive join-button raffles with verifiable draws
- ✅ **On-Chain Verification** — Every result links to PolygonScan
- ⚡ **Inline Mode** — Use `@OpenRNG_Dice_Bot` in any chat without adding the bot
- 🛡️ **Rate Limiting** — Built-in abuse protection

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/openrng/telegram-bot.git
cd telegram-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your bot token and OpenRNG endpoint

# Build and run
npm run build
npm start

# Or run in dev mode with hot reload
npm run dev
```

## 📋 Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/roll [NdN]` | Roll dice (default: 1d6) | `/roll 2d6`, `/roll d20` |
| `/flip` | Flip a coin | `/flip` |
| `/pick opt1 opt2 ...` | Random choice from options | `/pick pizza sushi tacos` |
| `/shuffle a b c ...` | Shuffle items randomly | `/shuffle Alice Bob Charlie` |
| `/lottery [N] [max]` | Pick lottery numbers (default: 6/49) | `/lottery 5 90` |
| `/wheel opt1 opt2 ...` | Spin the wheel | `/wheel red blue green` |
| `/teams N p1 p2 ...` | Split players into N teams | `/teams 2 Alice Bob Charlie Dave` |
| `/raffle Title` | Start a group raffle | `/raffle Friday Giveaway` |
| `/draw [N]` | Draw N raffle winners (default: 1) | `/draw 3` |
| `/verify <hash>` | Verify a result on-chain | `/verify abc123...` |
| `/about` | About OpenRNG | `/about` |
| `/help` | Show all commands | `/help` |

## 💬 Inline Mode

Use the bot in **any chat** without adding it to the group:

```
@OpenRNG_Dice_Bot roll 2d6
@OpenRNG_Dice_Bot flip
@OpenRNG_Dice_Bot pick pizza sushi tacos
@OpenRNG_Dice_Bot d20
```

Type `@OpenRNG_Dice_Bot` and a dropdown will appear with available actions. Results are posted with full verification links.

## 🔬 How It Works

OpenRNG produces verifiable random numbers through a multi-layer cryptographic pipeline:

1. **Entropy Generation** — Random entropy is sourced from Verifiable Delay Functions (VDFs) and public [drand](https://drand.love) beacons *before* any request arrives. This means results are pre-committed and cannot be influenced.

2. **Proof Creation** — Each random result is hashed and inserted into a Merkle tree. The tree produces an inclusion proof that binds the result to a specific batch.

3. **On-Chain Anchoring** — Merkle roots are periodically anchored to the Polygon blockchain, creating a permanent, tamper-proof record.

4. **Verification** — Anyone can take a result's proof hash, look it up on-chain, and cryptographically verify the result was generated fairly.

```
┌─────────────────────────────────────────────────────┐
│                   Telegram User                     │
│              /roll 2d6  →  🎲 [3, 5]               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              OpenRNG Dice Bot (grammY)               │
│  Parse command → Request RNG → Format → Reply        │
└──────────────────────┬───────────────────────────────┘
                       │  @openrng/sdk
                       ▼
┌──────────────────────────────────────────────────────┐
│                 OpenRNG Server                        │
│                                                      │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │   VDF   │──▶│  Entropy  │──▶│  Random Result   │  │
│  │ Engine  │   │   Pool    │   │  + Leaf Hash     │  │
│  └─────────┘   └──────────┘   └────────┬─────────┘  │
│                                         │            │
│  ┌─────────┐                           │            │
│  │  drand  │──▶ public beacon ─────────┘            │
│  │ beacon  │                                        │
│  └─────────┘                                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │              Merkle Tree                      │    │
│  │   leaf₁  leaf₂  leaf₃  ...  leafₙ           │    │
│  │      \   /          \   /                    │    │
│  │     node₁₂         node₃₄                   │    │
│  │         \           /                        │    │
│  │          Merkle Root ──────────────────┐      │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────┘
                       │  anchor tx
                       ▼
┌──────────────────────────────────────────────────────┐
│                 Polygon Blockchain                    │
│                                                      │
│   Merkle Root → Contract → Permanent Record          │
│   Verify at polygonscan.com                          │
└──────────────────────────────────────────────────────┘
```

## 🏗️ Self-Hosting Guide

### Prerequisites

- Node.js 20+ (22+ recommended)
- A running [OpenRNG server](https://github.com/openrng/openrng) instance
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Step-by-Step

1. **Create a Telegram bot**
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot` and follow the prompts
   - Copy the bot token

2. **Clone and install**
   ```bash
   git clone https://github.com/openrng/telegram-bot.git
   cd telegram-bot
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values (see [Environment Variables](#-environment-variables) below).

4. **Set up OpenRNG server**
   If you don't have an OpenRNG server running, see the [OpenRNG core repo](https://github.com/openrng/openrng) for setup instructions.

5. **Build and start**
   ```bash
   npm run build
   npm start
   ```

6. **Set bot commands** (optional)
   Message @BotFather and send:
   ```
   /setcommands
   roll - Roll dice (e.g. 2d6, d20)
   flip - Flip a coin
   pick - Random choice from options
   shuffle - Shuffle items randomly
   lottery - Pick lottery numbers
   wheel - Spin the wheel
   teams - Split players into teams
   raffle - Start a group raffle
   draw - Draw raffle winners
   verify - Verify a result on-chain
   about - About OpenRNG
   help - Show all commands
   ```

7. **Enable inline mode** (optional)
   Message @BotFather and send `/setinline`, then set a placeholder like `roll 2d6, flip, pick a b c`

### Running with PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name openrng-bot
pm2 save
pm2 startup
```

### Running with Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

```bash
docker build -t openrng-bot .
docker run -d --env-file .env --name openrng-bot openrng-bot
```

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Bot token from @BotFather |
| `OPENRNG_ENDPOINT` | ❌ | `http://localhost:3000` | OpenRNG server URL |
| `OPENRNG_API_KEY` | ❌ | — | API key for authenticated access |

## 🔌 SDK Integration

The bot uses [`@openrng/sdk`](https://github.com/openrng/sdk) to communicate with the OpenRNG server. Here's how the integration works:

```typescript
import { OpenRNG } from '@openrng/sdk';

// Initialize the SDK
const rng = new OpenRNG({
  agentId: 'my-telegram-bot',
  endpoint: 'http://localhost:3000',
  apiKey: process.env.OPENRNG_API_KEY,
  vertical: 'game',
  agentName: 'My Dice Bot',
  framework: 'custom',
});

// Roll dice — returns result + cryptographic proof
const roll = await rng.roll(2, 6);
console.log(roll.values);    // [3, 5]
console.log(roll.proof);     // { leafHash, merkleRoot, batchId, polygonTx }

// Coin flip
const flip = await rng.flip();
console.log(flip.result);    // 'heads' | 'tails'

// Random choice
const choice = await rng.choose(['pizza', 'sushi', 'tacos']);
console.log(choice.picked);  // 'sushi'

// Verify any past result
const valid = await OpenRNG.verify(roll.proof, 'http://localhost:3000');
console.log(valid);           // true

// Clean up
rng.destroy();
```

Every method returns the random result alongside its cryptographic proof, which can be independently verified against the Polygon blockchain.

## 📁 Project Structure

```
bot/
├── src/
│   ├── index.ts          # Bot entry point, middleware, lifecycle
│   ├── rng.ts            # OpenRNG SDK singleton wrapper
│   ├── format.ts         # Result formatting (Markdown + verify buttons)
│   ├── inline.ts         # Inline query handler
│   ├── rate-limit.ts     # Rate limiting middleware
│   ├── verify-url.ts     # Verification URL builder
│   └── commands/
│       ├── roll.ts       # /roll — Dice rolls
│       ├── flip.ts       # /flip — Coin flips
│       ├── pick.ts       # /pick — Random choice
│       ├── shuffle.ts    # /shuffle — Random shuffle
│       ├── lottery.ts    # /lottery — Lottery numbers
│       ├── wheel.ts      # /wheel — Wheel spinner
│       ├── teams.ts      # /teams — Team splitter
│       ├── raffle.ts     # /raffle + /draw — Group raffles
│       ├── verify.ts     # /verify — On-chain verification
│       ├── about.ts      # /about — Bot info
│       └── help.ts       # /help + /start — Help text
├── .env.example
├── package.json
└── tsconfig.json
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE) © 2026 OpenRNG Contributors

## 🔗 Links

- **OpenRNG Core** — [github.com/openrng/openrng](https://github.com/openrng/openrng)
- **OpenRNG SDK** — [github.com/openrng/sdk](https://github.com/openrng/sdk)
- **Telegram Bot** — [@OpenRNG_Dice_Bot](https://t.me/OpenRNG_Dice_Bot)
- **Website** — [openrng.org](https://openrng.org)
