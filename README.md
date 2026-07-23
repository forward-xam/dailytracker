# Day Mark

Personal daily routine tracker — permanent web app (no login).

## Permanent link

After GitHub Pages deploys:

**https://forward-xam.github.io/dailytracker/**

Use **Copy link** in the app (it includes your sync id) on both phone and laptop so data stays shared.

## What it does

- Daily routines with partial credit for counters
- Plans: 10-year / 1-year / 1-month / 1-day slots on the main page
- Stats, streaks, hide/archive tasks
- Data saved in your browser + synced across devices via the share link

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 (no base path locally).

## Production build

```bash
NEXT_PUBLIC_BASE_PATH=/dailytracker npm run build
```

Static files are written to `out/`.
