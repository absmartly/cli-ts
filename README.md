# ABSmartly CLI (TypeScript)

Command-line interface for managing experiments, feature flags, and A/B tests on the ABSmartly platform.

**Binary Name:** `abs` (package: `@absmartly/cli`)

## Installation

```bash
npm install -g @absmartly/cli
```

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build        # Build once
npm run build:watch  # Watch mode
```

### Run in Development

```bash
npm run dev -- experiments list
```

### Testing

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run once
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### Linting & Formatting

```bash
npm run lint          # Check code quality
npm run format        # Format code
npm run typecheck     # Type checking
```

## Quick Start

```bash
# 1. Authenticate
abs auth login --api-key YOUR_API_KEY --endpoint https://demo.absmartly.com/v1

# 2. List experiments
abs experiments list

# 3. Get experiment details
abs experiments get <id>
```

## Project Structure

```
absmartly-cli-ts/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── experiments/      # Experiments commands
│   │   ├── auth/             # Authentication commands
│   │   ├── config/           # Configuration commands
│   │   └── ...
│   ├── lib/
│   │   ├── api/              # API client
│   │   ├── config/           # Configuration management
│   │   ├── output/           # Output formatters
│   │   └── utils/            # Utilities
│   └── test/
│       ├── setup.ts          # Test setup
│       └── helpers/          # Test helpers
├── dist/                     # Build output
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## License

MIT
