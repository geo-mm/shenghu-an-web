# Project notes for Claude

San Juan card game, P2P multiplayer (React + Vite + TypeScript, boardgame.io, @boardgame.io/p2p).
See README.md for structure, rules implemented and how to run/test.

## Content rules (from the project owner — always follow)

1. **No official content in the repository.** Never commit text, scans, photos, PDFs or images
   from the official rulebooks or cards (any edition or publisher, including the Traditional
   Chinese 2nd edition). Rulebooks the owner shares are reference material only: read them,
   implement the rules, but keep them out of git (don't copy them into the working tree).
   - Card effect texts in `src/i18n/messages.ts` must be our own paraphrases, not quotes.
   - Short building / role names used for gameplay are fine.
2. **Card art will be redrawn by the owner with ChatGPT.** Don't add official card images or
   artwork; design the UI so custom images can be dropped in later.

## Workflow

- `npm test` (vitest) must pass; the Pages deploy runs it before building.
- Commit as the owner (`geo-mm`) and push to `main`; GitHub Pages deploys automatically.
