# IPO Calendar for Gloom

Upcoming and recently priced IPOs: expected date, price range, offer size, and the first-day return once it has traded.

## Install

Requires Gloom 0.15.0 or newer. Gloom restores this plugin once for existing installations when it moves out of the core app: saved panes keep working because the pane and template ids are unchanged, a previously disabled plugin stays disabled, and a deliberate removal is respected.

```sh
gloomberb install gloom-sh/gloom-ipo-calendar
```

Open `IPO` in the command bar. Also in the hosted web app at term.gloom.sh, where the host proxies the data source.

## Usage

`/` focuses the search, `r` refreshes, `o` opens the selected IPO on Stock Analysis. Activate a row to open the ticker once it trades. Narrow panes drop the SHARES, EXCH and OFFER columns, in that order, so the first-day return stays in view. When the upcoming or the recent list fails to load, the footer shows a warning and `!` says which half is missing; a board kept from before a failed refresh is marked stale. `gloomberb fn ipo-calendar` returns the headless model.

## Data

[Stock Analysis](https://stockanalysis.com). Unofficial; if the site changes, the pane breaks until this plugin is updated, which is one reason it is a plugin rather than part of the core app. The last good list is cached so the pane has something to show before the first fetch.

## Development

```sh
bun install
# Link a Gloom checkout, as the plugin installer does:
ln -s /path/to/gloomberb node_modules/gloomberb
ln -s /path/to/gloomberb/node_modules/react node_modules/react
bun run typecheck
bun test
```

`gloomberb` and `react` are peer dependencies, never real ones. Gloom symlinks its own copies into every plugin directory on install and on load, so there is exactly one instance of each in the process. CI links the host the same way.

## License

MIT
