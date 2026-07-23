# Day Mark

Personal daily routine tracker — better than a spreadsheet of 1s.

## What it does

- **Today**: check off ~30 seeded routines, counters for goals (posts, prayers, affirmations), mood 1–10
- **Stats**: daily %, 30-day heatmap, current/best streak (≥70% days), per-task streaks
- **Edit**: add, rename, hide, or archive tasks without breaking history
- **No login**: one shared server store — open the same URL on laptop and phone

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

Deploy anywhere Node can keep a writable `data/` folder (VPS, Railway, Render, Fly, Docker). Ephemeral hosts (some serverless platforms) will lose the JSON file on redeploy unless you attach persistent storage.

## Streaks

- **Day streak**: consecutive days at **70%+** completion (today can be in progress)
- **Task streak**: consecutive days you finished that specific task
