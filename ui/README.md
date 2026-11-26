# Tankful website

This Next.js site introduces Tankful and documents how to use the npm package. It does not run an agent or require a model key.

## Run

```bash
cd ui
npm install
npm run dev
```

Open http://localhost:3000.

## What's here

- `app/page.tsx`: package landing page.
- `app/docs/content/`: installation instructions, guides, and reference pages.
- `components/`: shared navigation, install commands, code examples, and artwork.

`next.config.ts` sets `turbopack.root` to the repository root so the app can import files from `../extension`.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
