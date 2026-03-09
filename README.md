# ABSmartly CLI

Command-line interface for managing experiments, feature flags, and A/B tests on the [ABSmartly](https://absmartly.com) platform.

```bash
npm install -g @absmartly/cli
```

Requires Node.js >= 18.

## Quick start

```bash
# Interactive setup wizard (recommended for first-time users)
abs setup

# Or authenticate manually
abs auth login --api-key YOUR_API_KEY --endpoint https://your-instance.absmartly.com/v1

# Verify configuration
abs doctor

# List experiments
abs experiments list

# Get experiment details
abs experiments get 123
```

## Authentication

The CLI stores credentials in your OS keychain and configuration in `~/.config/absmartly/config.yaml`.

```bash
# Login with API key
abs auth login --api-key YOUR_KEY --endpoint https://your-instance.absmartly.com/v1

# Login with a named profile
abs auth login --api-key YOUR_KEY --endpoint https://staging.absmartly.com/v1 --profile staging

# Check authentication status
abs auth status
abs auth status --show-key    # reveal last 4 chars of key

# Logout
abs auth logout
abs auth logout --profile staging
```

You can also override credentials per-command with global options:

```bash
abs experiments list --api-key YOUR_KEY --endpoint https://your-instance.absmartly.com/v1
```

## Global options

These options are available on every command:

| Option | Description |
|---|---|
| `--config <path>` | Config file path |
| `--api-key <key>` | Override API key |
| `--endpoint <url>` | Override API endpoint |
| `--app <name>` | Override default application |
| `--env <name>` | Override default environment |
| `-o, --output <format>` | Output format: `table` (default), `json`, `yaml`, `plain`, `markdown` |
| `--no-color` | Disable colored output |
| `-v, --verbose` | Verbose output |
| `-q, --quiet` | Minimal output |
| `--profile <name>` | Use a specific profile |
| `--terse` | Compact format with truncation |
| `--full` | Full text without truncation |

## Commands

### Experiments

Full lifecycle management for A/B tests and feature flags.

Aliases: `experiments`, `experiment`, `exp`

```bash
# List experiments with filters
abs experiments list
abs experiments list --state running --type test --limit 50
abs experiments list --app my-app --search "checkout"
abs experiments list --created-after 2025-01-01 --tags 1,2,3

# Search by name
abs experiments search "onboarding"

# Get experiment details
abs experiments get 123
abs experiments get 123 --activity    # include activity log

# Create an experiment
abs experiments create --name my-experiment --type test --variants "control,treatment"
abs experiments create --from-file experiment.md
abs experiments create --name my-experiment --dry-run     # preview payload
abs experiments create --name my-experiment --as-curl     # output as curl command

# Update an experiment
abs experiments update 123 --display-name "New Name" --traffic 50
abs experiments update 123 --from-file experiment.md

# Lifecycle transitions
abs experiments development 123                           # enter development mode
abs experiments start 123                                 # start experiment
abs experiments stop 123                                  # stop experiment
abs experiments restart 123 --reason other --reshuffle    # restart stopped experiment
abs experiments full-on 123 --variant 1                   # set full-on variant

# Archive
abs experiments archive 123
abs experiments archive 123 --unarchive

# Activity log
abs experiments activity list 123

# Schedule future actions
abs experiments schedule create 123 --action start --at 2026-04-01T10:00:00Z
abs experiments schedule delete 123 456

# Generate a markdown template for experiment creation
abs experiments generate-template -o experiment.md
```

#### Experiment list filters

| Filter | Description |
|---|---|
| `--state <state>` | `created`, `ready`, `running`, `stopped`, `archived` |
| `--type <type>` | `test`, `feature` |
| `--app <name>` | Filter by application |
| `--search <query>` | Search by name or display name |
| `--unit-types <ids>` | Comma-separated unit type IDs |
| `--owners <ids>` | Comma-separated owner user IDs |
| `--teams <ids>` | Comma-separated team IDs |
| `--tags <ids>` | Comma-separated tag IDs |
| `--created-after <ts>` | Filter by creation date |
| `--created-before <ts>` | Filter by creation date |
| `--started-after <ts>` | Filter by start date |
| `--started-before <ts>` | Filter by start date |
| `--stopped-after <ts>` | Filter by stop date |
| `--stopped-before <ts>` | Filter by stop date |
| `--analysis-type <type>` | `fixed_horizon`, `group_sequential` |
| `--running-type <type>` | `full_on`, `experiment` |
| `--significance <value>` | `positive`, `negative`, `insignificant` |
| `--limit <n>` | Max results (default: 20) |
| `--offset <n>` | Pagination offset |
| `--page <n>` | Page number |

### Feature flags

Convenience alias for experiments filtered to type `feature`.

Aliases: `flags`, `flag`, `features`, `feature`

```bash
abs flags list
abs flags get 123
```

### Goals

Aliases: `goals`, `goal`

```bash
abs goals list
abs goals get 123
abs goals create --name "Purchase completed"
abs goals update 123 --description "Updated description"
```

### Segments

Aliases: `segments`, `segment`

```bash
abs segments list
abs segments get 123
abs segments create my-segment --attribute user_country
abs segments update 123 --description "Updated"
abs segments delete 123
```

### Metrics

Aliases: `metrics`, `metric`

```bash
abs metrics list
abs metrics get 123
abs metrics create --name "Revenue" --type count
abs metrics update 123 --description "Updated"
abs metrics archive 123
abs metrics archive 123 --unarchive
```

### Teams

Aliases: `teams`, `team`

```bash
abs teams list
abs teams list --include-archived
abs teams get 123
abs teams create --name "Growth"
abs teams update 123 --description "Updated"
abs teams archive 123
abs teams archive 123 --unarchive
```

### Users

Aliases: `users`, `user`

```bash
abs users list
abs users list --include-archived
abs users get 123
abs users create --email user@example.com --name "Jane Doe"
abs users update 123 --name "Jane Smith"
abs users archive 123
abs users archive 123 --unarchive
```

### Tags

Manage tags for experiments, goals, and metrics.

```bash
# Experiment tags (aliases: tags, tag, experiment-tags)
abs tags list
abs tags get 1
abs tags create --tag "pricing"
abs tags update 1 --tag "pricing-v2"
abs tags delete 1

# Goal tags (aliases: goal-tags, goaltags)
abs goal-tags list
abs goal-tags create --tag "revenue"
abs goal-tags delete 1

# Metric tags (aliases: metric-tags, metrictags)
abs metric-tags list
abs metric-tags create --tag "engagement"
abs metric-tags delete 1
```

### Metric categories

Aliases: `metric-categories`, `metriccategories`, `metric-cats`

```bash
abs metric-categories list
abs metric-categories get 1
abs metric-categories create --name "Revenue" --color "#FF5733"
abs metric-categories update 1 --name "Revenue Metrics"
abs metric-categories archive 1
```

### Applications

Aliases: `apps`, `app`, `application`

```bash
abs apps list
abs apps get 1
```

### Environments

Aliases: `envs`, `env`, `environment`

```bash
abs envs list
abs envs get 1
```

### Unit types

Aliases: `units`, `unit`

```bash
abs units list
abs units get 1
```

### Administration

#### Roles

Aliases: `roles`, `role`

```bash
abs roles list
abs roles get 1
abs roles create --name "Editor"
abs roles update 1 --description "Can edit experiments"
abs roles delete 1
```

#### Permissions

Aliases: `permissions`, `permission`, `perms`, `perm`

```bash
abs permissions list
abs permissions categories
```

#### API keys

Aliases: `api-keys`, `apikeys`, `apikey`, `api-key`

```bash
abs api-keys list
abs api-keys get 1
abs api-keys create --name "CI/CD Key"
abs api-keys update 1 --description "Updated"
abs api-keys delete 1
```

#### Webhooks

Aliases: `webhooks`, `webhook`

```bash
abs webhooks list
abs webhooks get 1
abs webhooks create --name "Slack" --url https://hooks.slack.com/... --max-retries 5
abs webhooks update 1 --enabled false
abs webhooks delete 1
```

### Raw API access

Make arbitrary API requests for endpoints not covered by dedicated commands.

```bash
abs api /experiments
abs api /experiments -X POST -d '{"name": "test", "type": "test"}'
abs api /experiments -H "X-Custom: value"
```

### Code generation

Generate TypeScript types from your ABSmartly configuration.

```bash
abs generate types
abs generate types -o src/absmartly-types.ts
abs generate types --app my-app
```

This outputs a TypeScript file with union types for all experiment names in your account, useful for type-safe SDK integration.

### Utilities

```bash
# Open the ABSmartly dashboard in your browser
abs open
abs open experiments
abs open experiments 123

# Diagnose configuration issues
abs doctor

# Show version and build info
abs version

# Generate shell completion hints
abs completion bash
abs completion zsh
```

## Configuration

Configuration is stored in `~/.config/absmartly/config.yaml` as YAML. API keys are stored securely in your OS keychain via [keytar](https://github.com/nicktomlin/keytar).

```bash
# View current configuration
abs config list

# Get/set individual values
abs config get output
abs config set output json
abs config unset output

# Manage profiles
abs config profiles list
abs config profiles use staging
abs config profiles delete old-profile
```

### Configuration file format

```yaml
default-profile: default
analytics-opt-out: false
output: table
profiles:
  default:
    api:
      endpoint: https://your-instance.absmartly.com/v1
    expctld:
      endpoint: https://ctl.absmartly.io/v1
    application: my-app
    environment: production
  staging:
    api:
      endpoint: https://staging.absmartly.com/v1
    expctld:
      endpoint: https://ctl.absmartly.io/v1
    environment: staging
```

### Environment variables

| Variable | Description |
|---|---|
| `ABSMARTLY_API_KEY` | API key (overrides keychain) |
| `ABSMARTLY_API_ENDPOINT` | API endpoint URL |

## Experiment templates

Create experiments from Markdown template files with frontmatter:

```bash
# Generate a template with your account's applications and unit types pre-filled
abs experiments generate-template -o experiment.md

# Create an experiment from a template
abs experiments create --from-file experiment.md

# Update an experiment from a template
abs experiments update 123 --from-file experiment.md
```

## Development

### Setup

```bash
npm ci
```

### Build

```bash
npm run build          # compile TypeScript
npm run build:watch    # watch mode
```

### Run in development

```bash
npm run dev -- experiments list
```

### Testing

```bash
npm test               # watch mode
npm run test:run       # run once
npm run test:ui        # Vitest UI
npm run test:coverage  # coverage report
```

Tests use [MSW](https://mswjs.io/) (Mock Service Worker) for API mocking. Run against a live API with:

```bash
USE_LIVE_API=1 npm run test:run
```

### Linting and formatting

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # tsc --noEmit
```

## License

MIT
