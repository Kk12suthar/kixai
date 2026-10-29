# KiX

The front page of aikishor.live: a dark side and a light side, the people Kishor looks up to, and the Gita between them. `/about` is a separate app (the `portfolio` repo) that Netlify proxies from Vercel.

## Run locally

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:3000. `VITE_ENGINEER_REALM_URL` in `.env.development` points the /about link at the local portfolio app.

## Deploy

```bash
npx netlify-cli deploy --build --prod
```
