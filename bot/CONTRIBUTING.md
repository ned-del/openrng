# Contributing to OpenRNG Dice Bot

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20+ (22+ recommended)
- npm 10+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A running [OpenRNG server](https://github.com/openrng/openrng) instance (local is fine)

### Development Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/<your-username>/telegram-bot.git
   cd telegram-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your bot token and OpenRNG endpoint
   ```

4. **Run in dev mode**
   ```bash
   npm run dev
   ```
   This uses `tsx` for hot reload during development.

## Code Style

- **TypeScript** — All source code is in `src/`
- **ES Modules** — The project uses `"type": "module"`
- **Formatting** — Keep it clean and consistent with the existing codebase
- **Naming** — `camelCase` for variables/functions, `PascalCase` for types/interfaces
- **Exports** — Named exports preferred over default exports

## Project Structure

```
src/
├── index.ts          # Bot setup, middleware, lifecycle
├── rng.ts            # OpenRNG SDK wrapper (singleton)
├── format.ts         # Result formatting helpers
├── inline.ts         # Inline query handler
├── rate-limit.ts     # Rate limiting
├── verify-url.ts     # Verification URL builder
└── commands/         # One file per command
    ├── roll.ts
    ├── flip.ts
    └── ...
```

## Adding a New Command

1. Create `src/commands/your-command.ts`:
   ```typescript
   import type { CommandContext, Context } from 'grammy';
   import { getRNG } from '../rng.js';

   export async function yourCommand(ctx: CommandContext<Context>) {
     // Parse input from ctx.match
     // Call getRNG().someMethod()
     // Format and reply
   }
   ```

2. Register it in `src/index.ts`:
   ```typescript
   import { yourCommand } from './commands/your-command.js';
   bot.command('yourcommand', yourCommand);
   ```

3. Add a formatter in `src/format.ts` if needed.

4. Update the help text in `src/commands/help.ts`.

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** — Keep commits focused and descriptive.

3. **Build and test**
   ```bash
   npm run build
   ```

4. **Push and open a PR**
   ```bash
   git push origin feature/my-feature
   ```

5. **Describe your changes** — What does the PR do? Why? Any breaking changes?

## PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Update documentation if you change behavior
- Add the command to the help text and README if adding a new command
- Don't include build artifacts (`dist/`) in your PR

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) to file issues. Include:

- Steps to reproduce
- Expected vs actual behavior
- Bot version and Node.js version
- Relevant error messages or logs

## Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe:

- What problem does this solve?
- How should it work?
- Are there alternatives?

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
