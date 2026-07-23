# Day Mark

Personal daily routine tracker — better than a spreadsheet of 1s.

## What it does

- **Today**: check off routines; counters contribute **partial %** (e.g. 3/10 prayers = 30% of that task)
- **Plans**: write & complete 10-year / 1-year / 1-month / 1-day plans — writing unlocks 25% of each slot, finishing items fills the rest
- **Stats**: daily %, 30-day heatmap, streaks (≥70%), per-task streaks
- **Edit**: add, rename, hide, or archive tasks
- **No login**: one shared server store — open the same URL on laptop and phone

## Scoring

Each active routine + each of the 4 plan horizons is one equal share of the day.

- Checkbox: 0% or 100% of that share
- Counter (prayers, affirmations ×2000, back sets ×3, posts, etc.): `count / target`
- Plan horizon: 0 if empty; otherwise 25% for writing + 75% × (done items / total items)

## Colors

Black / charcoal backgrounds, white text, gray muted UI, **orange** accents.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Data is saved in `data/store.json` on the server so every device hitting that URL shares the same marks.

## Production

```bash
npm run build
npm start
```

Deploy anywhere Node can keep a writable `data/` folder (VPS, Railway, Render, Fly, Docker).
