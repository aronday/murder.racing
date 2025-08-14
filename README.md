# Top Gear Leaderboard — Vercel Ready (v5)

Freestanding Top Gear–style weekly leaderboard (Sunday→Sunday) with centered logo + padding, Tailwind, and a `/api/laps` proxy that runs on Vercel.

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Vercel
Push to GitHub, then import the repo in Vercel. Defaults are fine:
- Install: `npm ci`
- Build: `next build`
- Output: (leave blank)

## Logo
Your logo is referenced at `/murder-racing.png`. Replace the file in `public/` if needed.
