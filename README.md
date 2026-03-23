# ABSmartly CLI

Command-line interface for managing experiments, feature flags, and A/B tests on the [ABSmartly](https://absmartly.com) platform.

```bash
npm install -g @absmartly/cli
```

Requires Node.js >= 18.

## Quick start

```bash
# Interactive setup wizard
abs setup

# Non-interactive setup
abs setup --api-key YOUR_KEY --endpoint https://your-instance.absmartly.com/v1
abs setup --api-key YOUR_KEY --endpoint https://staging.absmartly.com/v1 --profile staging

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

The CLI stores credentials in your OS keychain (via keytar) and configuration in `~/.config/absmartly/config.yaml`. On headless systems without a keychain service, credentials fall back to `~/.config/absmartly/credentials.json` (chmod 600).

```bash
# Login with API key
abs auth login --api-key YOUR_KEY --endpoint https://your-instance.absmartly.com/v1

# Login with a named profile
abs auth login --api-key YOUR_KEY --endpoint https://staging.absmartly.com/v1 --profile staging

# Check authentication status
abs auth status
abs auth status --show-key    # reveal full API key
abs auth status --profile staging

# Show current authenticated user
abs auth whoami
abs auth whoami --avatar       # display avatar inline (iTerm2, Kitty, Sixel)
abs auth whoami --avatar 30    # avatar at 30 columns wide

# Manage personal API keys
abs auth list-api-keys
abs auth get-api-key 1
abs auth update-api-key 1 --name "Renamed Key"
abs auth delete-api-key 1

# Edit your profile
abs auth edit-profile --first-name "Jonas" --last-name "Alves" --department "Engineering"

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
| `-o, --output <format>` | Output format: `table` (default), `json`, `yaml`, `plain`, `markdown`, `rendered`, `vertical`, `template` |
| `--no-color` | Disable colored output |
| `-v, --verbose` | Verbose output |
| `-q, --quiet` | Minimal output |
| `--profile <name>` | Use a specific profile |
| `--terse` | Compact format with truncation |
| `--full` | Full text without truncation |
| `--raw` | Show raw API response without summarizing or transforming |

## Commands

### Experiments

Full lifecycle management for A/B tests and feature flags.

Aliases: `experiments`, `experiment`, `exp`, `features`, `feature`

Use `abs features` instead of `abs experiments` to auto-filter by `type=feature`.

All experiment commands accept **names or IDs** — e.g. `abs experiments get checkout_redesign` resolves the name to the latest iteration's ID automatically.

```bash
# List experiments with filters and pagination
abs experiments list
abs experiments list --state running --items 50 --sort created_at --desc
abs experiments list --app my-app --search "checkout" --page 2
abs experiments list --created-after 2025-01-01 --tags 1,2,3

# Customize columns
abs experiments list --show experiment_report archived   # add extra columns
abs experiments list --exclude primary_metric owner      # hide columns

# Search by name
abs experiments search "onboarding"

# Get experiment details
abs experiments get 123                                  # summary table
abs experiments get 123 -o vertical                      # one field per line
abs experiments get 123 -o json                          # summary as JSON
abs experiments get 123 -o json --raw                    # full API response as JSON
abs experiments get 123 --show audience Hypothesis       # include extra fields
abs experiments get 123 --exclude owners tags            # hide fields from output
abs experiments get 123 --activity                       # include activity log

# Inline screenshots (iTerm2, Kitty, Sixel)
abs experiments get 123 --show-images                    # display variant screenshots
abs experiments get 123 --show-images 60                 # at 60 columns wide

# Template export (for cloning, editing, round-tripping)
abs experiments get 123 -o template                      # markdown template
abs experiments get 123 -o template --embed-screenshots  # with base64 screenshots
abs experiments get 123 -o template --screenshots-dir ./screenshots  # save screenshots as files

# Create an experiment
abs experiments create --name my-experiment --variants "control,treatment"
abs experiments create --name my-experiment --secondary-metrics "Revenue,Bookings"
abs experiments create --name my-experiment --teams "Product" --tags "v1"
abs experiments create --name my-experiment --audience '{"filter":[]}'
abs experiments create --name my-experiment --analysis-type fixed_horizon
abs experiments create --name my-experiment --hypothesis "We believe X"  # custom fields
abs experiments create --name my-experiment --field "Hypothesis=We believe X"  # generic fallback
abs experiments create --from-file experiment.md         # from template
abs experiments create --name my-experiment --dry-run    # preview payload
abs experiments create --name my-experiment --as-curl    # output as curl command
cat template.md | abs experiments create --from-file -   # from stdin

# Clone an experiment
abs experiments clone 123 --name my-clone                # clone with new name
abs experiments clone 123 --name my-clone --dry-run      # preview
abs experiments clone 123 --name my-clone --from-file overrides.md  # clone with changes

# Update an experiment
abs experiments update 123 --display-name "New Name"
abs experiments update 123 --name new_name --state running
abs experiments update 123 --percentage-of-traffic 50 --percentages 30,70
abs experiments update 123 --primary-metric 145 --unit-type 3 --application-id 5
abs experiments update 123 --variants "control,treatment,treatment2"
abs experiments update 123 --secondary-metrics "Revenue,Bookings"
abs experiments update 123 --guardrail-metrics "Error rate"
abs experiments update 123 --teams "Product,Engineering" --tags "v1,mobile"
abs experiments update 123 --audience '{"filter":[]}'
abs experiments update 123 --analysis-type fixed_horizon --required-alpha 0.05
abs experiments update 123 --owner 10 --owner 20
abs experiments update 123 --screenshot-id 0:376 --screenshot-id 1:378  # restore screenshots by upload ID
abs experiments update 123 --from-file experiment.md     # update from template
abs experiments update 123 --from-file experiment.md --dry-run
abs experiments update 123 -i                            # interactive editor

# Lifecycle transitions
abs experiments development 123                          # enter development mode
abs experiments start 123                                # start experiment
abs experiments start 123 --note "Ready for traffic"     # with activity note
abs experiments stop 123                                 # stop experiment
abs experiments stop 123 --reason hypothesis_rejected --note "Inconclusive results"
abs experiments restart 123 --reason other --reshuffle   # restart stopped experiment
abs experiments restart 123 --from-file changes.md       # restart with template changes
abs experiments restart 123 --as-type feature            # restart as feature flag
abs experiments full-on 123 --variant 1                  # set full-on variant

# Archive
abs experiments archive 123
abs experiments archive 123 --note "Cleaning up old experiments"
abs experiments archive 123 --unarchive

# Metric results (--from/--to accept all date formats, see [date formats](#date-formats))
abs experiments metrics list 123                         # list assigned metrics
abs experiments metrics results 123                      # show results with CI as [lower, upper]
abs experiments metrics results 123 --ci-bar             # visual CI bar ╌╌╌┊╌══●══╌╌╌
abs experiments metrics results 123 --variant-index      # use v0, v1, v2 instead of names
abs experiments metrics results 123 --metric 6           # any metric, even unassigned
abs experiments metrics results 123 --segment Device     # segment breakdown by name
abs experiments metrics results 123 --segment Device Country  # multiple segments
abs experiments metrics results 123 --filter '{"filter":[...]}' # raw segment filter JSON
abs experiments metrics results 123 --from 7d --to now   # time range filter
abs experiments metrics results 123 -o json              # programmatic metric access
abs experiments metrics add 123 --metrics 1,2,3
abs experiments metrics confirm-impact 123 456
abs experiments metrics exclude 123 456
abs experiments metrics include 123 456

# Metric dependencies
abs experiments metrics deps 145                         # show experiments using metric
abs experiments metrics deps 145 -o json                 # as JSON
```

Impact values are colored by significance and metric effect direction:
- **Green**: significant positive outcome (e.g. conversion rate up, or cancellations down)
- **Red**: significant negative outcome (e.g. conversion rate down, or cancellations up)
- **Purple**: significant but metric has unknown expected direction
- **No color**: confidence interval crosses zero (result not statistically significant)

```bash

# Activity log
abs experiments activity list 123
abs experiments activity create 123 --note "Deployed to staging"
abs experiments activity edit 123 456 --note "Updated note"
abs experiments activity reply 123 456 --note "Looks good"

# Parent experiment
abs experiments parent 123                               # get parent experiment

# Follow/unfollow
abs experiments follow 123
abs experiments unfollow 123

# Annotations
abs experiments annotations list 123
abs experiments annotations create 123 --type global
abs experiments annotations update 456 --type local
abs experiments annotations archive 456

# Alerts and recommendations
abs experiments alerts list 123
abs experiments alerts dismiss 456
abs experiments recommendations list 123
abs experiments recommendations dismiss 456

# Access control
abs experiments access list-users 123
abs experiments access grant-user 123 --user 1 --role 2
abs experiments access revoke-user 123 --user 1 --role 2
abs experiments access list-teams 123
abs experiments access grant-team 123 --team 1 --role 2
abs experiments access revoke-team 123 --team 1 --role 2

# Export data and request update
abs experiments export 123
abs experiments request-update 123

# Schedule future actions
abs experiments schedule create 123 --action start --at 2026-04-01T10:00:00Z
abs experiments schedule delete 123 456

# Compare experiments
abs experiments diff 22838 22839                         # diff two experiments
abs experiments diff 22838 --iteration 6                 # diff with a previous iteration
abs experiments diff 22838 22839 -o json                 # diff as JSON
abs experiments diff 22838 22839 --raw                   # diff full API response

# Watch live results
abs experiments watch 22838                              # poll metrics every 60s
abs experiments watch 22838 --interval 30                # poll every 30s
abs experiments watch 22838 --variant-index              # use v0, v1, v2 instead of names

# Bulk operations
abs experiments bulk start 123 456 789 --note "Resuming"
abs experiments bulk stop 123 456 --reason hypothesis_rejected --note "Results inconclusive"
abs experiments bulk archive 123 456 --yes
abs experiments bulk full-on 123 --variant 1 --note "Winner confirmed"
abs experiments bulk development 123 456 --note "Moving to dev"
abs experiments bulk stop --state running --app my-app --note "Maintenance"
echo "123\n456" | abs experiments bulk stop --stdin --yes --reason other --note "Automated"

# Generate a markdown template for experiment creation
abs experiments generate-template -o experiment.md

# Refresh custom fields cache (enables custom fields as --help options)
abs experiments refresh-fields
```

#### Custom field options

After running `abs experiments refresh-fields`, custom fields from your ABsmartly instance appear as native CLI options:

```bash
abs experiments create --help
# Shows: --hypothesis <value>, --jira-url <value>, etc.

abs experiments create --name test --hypothesis "We believe X" --jira-url "https://jira.example.com/IT-1"
abs experiments update 123 --hypothesis "Updated hypothesis"
abs experiments restart 123 --hypothesis "New iteration"

# Generic fallback (works without cache)
abs experiments create --name test --field "Hypothesis=We believe X"
```

#### Summary output

All `list` and `get` commands return summarized output by default. Use `--raw` for the full API response.

```bash
abs experiments get 123 -o json                          # clean summary as JSON
abs experiments get 123 -o json --raw                    # full API response
abs experiments get 123 -o rendered                      # terminal-rendered markdown with styling
abs experiments list --show experiment_report archived    # add extra fields
abs experiments list --exclude owner impact confidence    # hide fields
abs metrics list --show description --exclude effect      # works on all entities
abs goals get 1 --show created_by_user_id
```

The `rendered` format outputs terminal-styled markdown with bold, tables, syntax-highlighted code blocks, ● bullets, and │ blockquotes.

JSON and YAML outputs include syntax highlighting by default. Use `--no-color` to disable it.

#### Experiment list filters

| Filter | Description |
|---|---|
| `--state <state>` | `created`, `ready`, `running`, `development`, `full_on`, `stopped`, `archived`, `scheduled` |
| `--type <type>` | `test`, `feature` |
| `--app <name>` | Filter by application name |
| `--applications <ids>` | Filter by application IDs (comma-separated) |
| `--search <query>` | Search by name or display name |
| `--ids <ids>` | Filter by experiment IDs (comma-separated) |
| `--unit-types <ids>` | Comma-separated unit type IDs |
| `--owners <ids>` | Comma-separated owner user IDs |
| `--teams <ids>` | Comma-separated team IDs |
| `--tags <ids>` | Comma-separated tag IDs |
| `--impact <min,max>` | Filter by impact range (e.g. `-5,50`) |
| `--confidence <min,max>` | Filter by confidence range (e.g. `90,100`) |
| `--significance <value>` | `positive`, `negative`, `neutral`, `inconclusive` |
| `--iterations <n>` | Filter by iteration count |
| `--iterations-of <id>` | Show all iterations of an experiment |
| `--created-after <ts>` | Filter by creation date (see [date formats](#date-formats)) |
| `--created-before <ts>` | Filter by creation date |
| `--started-after <ts>` | Filter by start date |
| `--started-before <ts>` | Filter by start date |
| `--stopped-after <ts>` | Filter by stop date |
| `--stopped-before <ts>` | Filter by stop date |
| `--analysis-type <type>` | `fixed_horizon`, `group_sequential` |
| `--running-type <type>` | `full_on`, `experiment` |
| `--alert-srm` | Has sample ratio mismatch alert (pass `0` for no alert) |
| `--alert-cleanup-needed` | Has cleanup needed alert |
| `--alert-sample-size-reached` | Sample size reached alert |
| `--items <n>` | Results per page (default: 20) |
| `--page <n>` | Page number (default: 1) |
| `--sort <field>` | Sort by field (e.g. `created_at`, `name`, `state`) |
| `--asc` | Sort ascending |
| `--desc` | Sort descending |
| `--show <fields...>` | Add extra columns (e.g. `experiment_report archived`) |
| `--exclude <fields...>` | Hide columns (e.g. `primary_metric owner`) |

#### Date formats

All `--from`, `--to`, `--since`, `--created-after`, `--started-before`, and other date/timestamp options across the CLI accept the same formats:

| Format | Example |
|---|---|
| Relative (short) | `7d`, `2w`, `1mo`, `24h`, `30m`, `1y` |
| Relative (with ago) | `7d ago`, `2 weeks ago`, `3 months ago` |
| Keywords | `today`, `yesterday`, `now` |
| ISO 8601 date | `2024-01-01` |
| ISO 8601 datetime | `2024-01-01T00:00:00Z` |
| Epoch milliseconds | `1704067200000` |

Relative units: `m` (minutes), `h` (hours), `d` (days), `w` (weeks), `mo` (months), `y` (years). Case-insensitive.

Commands using date formats:
- `abs experiments list --created-after`, `--created-before`, `--started-after`, `--started-before`, `--stopped-after`, `--stopped-before`
- `abs experiments metrics results --from`, `--to`
- `abs activity-feed list --since`
- `abs events list --from`, `--to`
- `abs events history --from`, `--to`
- `abs events json-values --from`, `--to`
- `abs events json-layouts --from`, `--to`

```bash
abs experiments list --created-after 7d                  # last 7 days
abs experiments list --stopped-after "30 days ago"       # stopped in last month
abs experiments list --started-after yesterday
abs experiments list --created-after 2024-01-01          # since Jan 1 2024
abs experiments metrics results 123 --from 7d --to now
abs activity-feed list --since 1h
abs events list --from 2w --to yesterday
```

### Activity feed

Global activity feed across all experiments. Scans recent experiments and aggregates their activity notes. `--since` accepts all [date formats](#date-formats).

Aliases: `activity-feed`

```bash
# List recent activity
abs activity-feed list
abs activity-feed list --since 7d
abs activity-feed list --search checkout_redesign         # filter by experiment name
abs activity-feed list --state running --experiments 100   # scan more experiments
abs activity-feed list --limit 50                          # show more entries

# Show rendered markdown notes (bold, code, tables, mentions resolved to names)
abs activity-feed list --notes
abs activity-feed list --notes --show-images               # inline images in notes

# Watch activity in real-time
abs activity-feed watch --notes
abs activity-feed watch --interval 10 --notes
abs activity-feed watch --state running

# Per-experiment activity (also accepts names)
abs experiments activity list checkout_redesign --notes
abs experiments activity list checkout_redesign --notes --show-images
abs experiments activity create checkout_redesign --note "Deployed to staging"
```

Notes render with full markdown support via `marked-terminal`: **bold**, *italic*, `code`, tables, ● bullets, │ blockquotes, syntax-highlighted code blocks, and @mention resolution (user/team names).

### Feature flags

`abs features` is the same as `abs experiments` but auto-filters to `type=feature`.
All subcommands work identically.

```bash
abs features list
abs features get 123
abs features create --from-file flag.md
abs features clone 123 --name my-clone
abs features restart 123 --as-type experiment    # convert to experiment
```

### Goals

Aliases: `goals`, `goal`

```bash
abs goals list
abs goals get 123
abs goals create --name "Purchase completed"
abs goals update 123 --description "Updated description"

# Follow/unfollow
abs goals follow 123
abs goals unfollow 123

# Access control
abs goals access list-users 123
abs goals access grant-user 123 --user 1 --role 2
abs goals access revoke-user 123 --user 1 --role 2
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

# Follow/unfollow
abs metrics follow 123
abs metrics unfollow 123

# Reviews
abs metrics review status 123
abs metrics review request 123
abs metrics review approve 123
abs metrics review comments 123
abs metrics review comment 123 --message "Looks correct"
abs metrics review reply 123 456 --message "Thanks"

# Access control
abs metrics access list-users 123
abs metrics access grant-user 123 --user 1 --role 2
abs metrics access revoke-user 123 --user 1 --role 2
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

# Team members
abs teams members list 123
abs teams members add 123 --users 1,2,3 --roles 1,2
abs teams members edit-roles 123 --users 1,2 --roles 3,4
abs teams members remove 123 --users 1,2
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

# Reset password
abs users reset-password 123
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
abs apps create --name "Mobile App"
abs apps update 1 --name "Mobile App v2"
abs apps archive 1
abs apps archive 1 --unarchive
```

### Environments

Aliases: `envs`, `env`, `environment`

```bash
abs envs list
abs envs get 1
abs envs create --name "staging"
abs envs update 1 --name "production"
abs envs archive 1
abs envs archive 1 --unarchive
```

### Unit types

Aliases: `units`, `unit`

```bash
abs units list
abs units get 1
abs units create --name "device_id"
abs units update 1 --name "user_id"
abs units archive 1
abs units archive 1 --unarchive
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
abs permissions policies
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

# Webhook event types
abs webhooks events
```

### Favorites

Manage favorite experiments and metrics.

Aliases: `favorites`, `favorite`, `fav`

```bash
abs favorites add experiment 123
abs favorites add metric 456
abs favorites remove experiment 123
abs favorites remove metric 456
```

### Notifications

View and manage notifications.

Aliases: `notifications`, `notification`, `notif`

```bash
abs notifications list
abs notifications list --cursor 100
abs notifications mark-seen
abs notifications mark-read --ids 1,2,3
abs notifications check
```

### Asset roles

Manage global asset roles for access control.

Aliases: `asset-roles`, `assetroles`

```bash
abs asset-roles list
abs asset-roles get 1
abs asset-roles create --name "Reviewer"
abs asset-roles update 1 --name "Lead Reviewer"
abs asset-roles delete 1
```

### Custom sections

Manage experiment custom sections.

Aliases: `custom-sections`, `customsections`

```bash
abs custom-sections list
abs custom-sections create --name "Launch Checklist" --type test
abs custom-sections update 1 --name "Updated Checklist"
abs custom-sections archive 1
abs custom-sections archive 1 --unarchive
abs custom-sections reorder --sections "1:0,2:1,3:2"
```

### Events

View and manage event tracking data. `--from`/`--to` accept all [date formats](#date-formats).

Aliases: `events`, `event`

```bash
abs events list --from 7d --to now
abs events list --event-name my-experiment --event-type exposure --from 5h
abs events list --app 1 --unit-type 2 --event-type exposure --items 50
abs events list --unit-uid user123 --env-type production
abs events list --effective-exposures --from 1d              # only assignment-changing exposures
abs events list --event-name exp1 --event-name exp2          # multiple names (all filters repeatable)
abs events history --from 7d --period 1d
abs events history --event-name my-experiment --env-type production
abs events unit-data 1:user123 2:device456
abs events delete-unit-data 1:user123
abs events json-values --event-type exposure --path "variant" --experiment-id 123
abs events json-layouts --source unit_attribute --phase after_enrichment
```

### Insights

View experiment velocity and decision analytics. `--from`/`--to` accept ISO dates (see [date formats](#date-formats)).

Aliases: `insights`, `insight`

```bash
abs insights velocity --from 2026-01-01 --to 2026-03-01 --aggregation month
abs insights decisions --from 2026-01-01 --to 2026-03-01 --aggregation week
abs insights velocity --from 2026-01-01 --to 2026-03-01 --aggregation day --teams 1,2
abs insights velocity-detail --from 2026-01-01 --to 2026-03-01 --aggregation month
abs insights decisions-history --from 2026-01-01 --to 2026-03-01 --aggregation week
```

### Statistics

Statistical analysis tools for experiment planning.

Aliases: `statistics`, `stats`

```bash
abs statistics power-matrix --config '{"split":[0.5,0.5],"metric_mean":100,"metric_variance":25,"metric_type":"count","powers":[0.8,0.9]}'
```

### Storage configs

Manage storage destinations for data exports.

Aliases: `storage-configs`, `storageconfigs`

```bash
abs storage-configs list
abs storage-configs get 1
abs storage-configs create --config '{"type": "s3", ...}'
abs storage-configs update 1 --config '{"bucket": "new-bucket"}'
abs storage-configs test --config '{"type": "s3", ...}'
```

### Action dialog fields

Manage fields shown in experiment action dialogs (start, stop, etc.).

Aliases: `action-dialog-fields`, `actiondialogfields`

```bash
abs action-dialog-fields list
abs action-dialog-fields get 1
abs action-dialog-fields create --config '{"name": "Reason", "type": "text"}'
abs action-dialog-fields update 1 --config '{"required": true}'
```

### Platform configuration

Manage server-side platform settings (not local CLI config).

Aliases: `platform-config`, `platformconfig`, `platform-configs`

```bash
abs platform-config list
abs platform-config get 1
abs platform-config update 1 --value '{"key": "value"}'
```

### CORS origins

Manage allowed CORS origins.

```bash
abs cors list
abs cors get 1
abs cors create --origin "https://app.example.com"
abs cors update 1 --origin "https://new.example.com"
abs cors delete 1
```

### Datasources

Manage event data source configurations.

Aliases: `datasources`, `datasource`, `ds`

```bash
abs datasources list
abs datasources get 1
abs datasources create --config '{"type": "postgres", ...}'
abs datasources update 1 --config '{"host": "new-host"}'
abs datasources archive 1
abs datasources test --config '{"type": "postgres", ...}'
abs datasources introspect --config '{"type": "postgres", ...}'
abs datasources validate-query --config '{"query": "SELECT ..."}'
abs datasources preview-query --config '{"query": "SELECT ..."}'
abs datasources set-default 1
abs datasources schema 1
```

### Export configurations

Manage scheduled data export configurations.

Aliases: `export-configs`, `exportconfigs`, `export-config`

```bash
abs export-configs list
abs export-configs get 1
abs export-configs create --config '{"destination": "s3", ...}'
abs export-configs update 1 --config '{"schedule": "daily"}'
abs export-configs archive 1
abs export-configs pause 1
abs export-configs histories 1
abs export-configs cancel-history 1 42 --reason "No longer needed"
```

### Update schedules

Manage experiment analysis update schedules.

Aliases: `update-schedules`, `updateschedules`

```bash
abs update-schedules list
abs update-schedules get 1
abs update-schedules create --config '{"interval": "1h"}'
abs update-schedules update 1 --config '{"interval": "30m"}'
abs update-schedules delete 1
```

### Raw API access

Make arbitrary API requests for endpoints not covered by dedicated commands.

```bash
# GET requests
abs api /experiments
abs api "/experiments?search=Bundle&items=5&previews=1"
abs api /metrics?archived=true -o json

# POST requests
abs api /experiments -X POST -d '{"name": "test", "type": "test"}'
abs api -X POST "/experiments/123/metrics/145" -o json   # fetch metric data

# Custom headers
abs api /experiments -H "X-Custom: value"
```

### Utilities

```bash
# Open the ABSmartly dashboard in your browser
abs open
abs open experiments
abs open experiments 123

# Diagnose configuration issues
abs doctor
```

`abs doctor` validates API connectivity, profile configuration, custom fields cache status, credentials file permissions, and warns about stale experiments stuck in "created" state.

```bash
# Show version and build info
abs version
```

#### Shell completions

Generate shell completions for Bash or Zsh with tab-completion for commands, subcommands, and options.

```bash
# Bash
eval "$(abs completion bash)"
# Or persist:
abs completion bash >> ~/.bashrc

# Zsh
eval "$(abs completion zsh)"
# Or persist:
abs completion zsh >> ~/.zshrc
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
| `ABSMARTLY_API_KEY` | API key (overrides keychain and credentials file) |
| `ABSMARTLY_API_ENDPOINT` | API endpoint URL (overrides profile config) |

API key resolution order: `--api-key` flag > `ABSMARTLY_API_KEY` env > OS keychain > `~/.config/absmartly/credentials.json`

## Experiment templates

The CLI uses Markdown templates with YAML frontmatter for experiment round-trips.
All names (metrics, owners, teams, tags, applications) are resolved by name — no IDs needed.

```bash
# Generate a blank template
abs experiments generate-template -o experiment.md

# Export an existing experiment as a template
abs experiments get 123 -o template > experiment.md
abs experiments get 123 -o template --embed-screenshots > experiment.md  # with base64 screenshots
abs experiments get 123 -o template --screenshots-dir ./screenshots      # save screenshots as files

# Create from template
abs experiments create --from-file experiment.md
abs experiments create --from-file experiment.md --dry-run   # preview payload
cat experiment.md | abs experiments create --from-file -     # from stdin

# Update from template
abs experiments update 123 --from-file experiment.md

# Clone (shortcut)
abs experiments clone 123 --name my-clone

# Restart with changes
abs experiments restart 123 --from-file changes.md --reason hypothesis_iteration
```

### Template format

```markdown
---
name: my_experiment
display_name: "My Experiment"
unit_type: user_id
application: www
primary_metric: Net conversion rate
secondary_metrics:
  - Gross conversion rate
  - Product page views
guardrail_metrics:
  - Page load time (ms)
  - Error rate
percentages: 50/50
percentage_of_traffic: 100
owners:
  - Márcio Martins <marcio@absmartly.com>
  - Cal Courtney <cal@absmartly.com>
teams:
  - Product
  - Engineering
tags:
  - q1
  - homepage
analysis_type: group_sequential
required_alpha: 0.1
required_power: 0.8
baseline_participants: 143
---

## Audience

```json
{
  "filter": [
    { "and": [{ "eq": [{ "var": { "path": "language" } }, { "value": "en-GB" }] }] }
  ]
}
```

## Variants

### variant_0

name: Control
config: {}
screenshot: ./screenshots/control.png

### variant_1

name: Treatment
config: {"feature_enabled": true}
screenshot: ./screenshots/treatment.png

## Description

### Hypothesis

We believe changing X will improve Y by Z%.

### Implementation Details

Details here...

## JIRA

### JIRA URL

https://jira.example.com/IT-1234
```

Template features:
- **Metrics**: resolved by name, including archived metrics
- **Owners**: `Name <email>`, email, or user ID
- **Teams/tags**: resolved by name
- **Audience**: JSON code block, parsed and compacted for the API
- **Custom fields**: grouped by section name (matches UI sections)
- **User-type fields**: exported as email, converted back to `{"selected":[{"userId":N}]}`
- **Screenshots**: local file paths, URLs, or base64 data URIs
- **Type**: inferred from command (`abs experiments` → test, `abs features` → feature)

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
