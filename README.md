# San Juan · P2P

React + Vite + TypeScript SPA for a 2‑player card game using
[boardgame.io](https://boardgame.io) and the experimental
[`@boardgame.io/p2p`](https://github.com/boardgameio/p2p) transport. There is no game server:
the host's browser runs the authoritative boardgame.io `Master`, and the guest talks to it
directly over a WebRTC data channel.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in dist/ — host anywhere (GitHub Pages, Netlify, …)
```

Open the app in two browsers (or two devices):

1. **Browser A** → *Host Game*. A room token (e.g. `K7PX2M`) and an invite link appear.
2. **Browser B** → type the token into *Join Game* (or open the invite link).
3. Status goes *Connecting → Waiting for opponent → Connected*, the player list shows both
   players online, and the board appears on both screens.
4. Press *Draw Card* on whichever screen has the turn; the card, turn counter and state ID
   update on both screens.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. One-time setup:
repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is then
served at `https://<owner>.github.io/<repo>/`.

## Testing with two players

Use two *separate* browser sessions so each gets its own peer — e.g. a normal window and an
incognito window, two different browsers, or a computer and a phone. Host in one, join with the
token (or invite link) in the other, then take turns pressing *Draw Card* and check both screens
show the same hands, turn number and state ID.

## How it fits together

| File | Purpose |
| --- | --- |
| `src/game/cards.ts` | Card data: all 29 buildings (110 cards) with cost, VP, count, effect text and Chinese names; roles; trading house tiles. |
| `src/game/state.ts` | Game state types (`SanJuanState`, players, step machine, scores). |
| `src/game/engine.ts` | The rules: pure functions for every decision (`act*`), automatic flow (`advance`), costs/limits and scoring. |
| `src/game/SanJuanGame.ts` | boardgame.io wrapper: moves (host-only, `client: false`), turn order follows `G.actor`, `playerView` hides secret cards. |
| `src/game/bot.ts` | Lists legal actions; used by tests to play full random games (and a future AI). |
| `src/game/engine.test.ts` | Unit tests plus 45 complete random 2–4 player games (`npm test`). |
| `src/hooks/useP2PMatch.ts` | Creates the boardgame.io client with `P2P({ isHost })`, exposes state, player list and connection status. |
| `src/components/Lobby.tsx`, `ConnectionStatus.tsx` | Host / join UI and live connection status. |
| `src/components/Board.tsx`, `CardView.tsx` | Playable board: roles, buildings, hand and per-phase controls, log, final scores. |
| `src/components/CardInfo.tsx` | Card details dialog, opened by right-click (or long-press on phones). |
| `src/i18n/` | English / Traditional Chinese UI text, card names and effects; the choice is remembered per browser. Game logs are structured, so each player reads them in their own language. |

The room token is the boardgame.io `matchID`; the P2P transport derives the host's PeerJS ID
from it, so the guest can find the host with just the token. The host is player `0`, the guest
player `1`. The lobby currently seats 2 players; the rules engine supports 2–4.

## Rules implemented (San Juan, first edition base game)

- **Setup:** each player gets an indigo plant in play and 4 cards; random governor.
- **Round:** governor phase (chapel tuck, hand limit 7 / 12 with tower) → each player picks one
  role in turn (2 players: governor, opponent, governor again) → everyone resolves it clockwise
  from the chooser, who gets the privilege. The governor then passes left.
- **Roles:** Builder (−1 card), Producer (+1 good), Trader (+1 good, trading house tile cycles
  top → bottom), Councillor (draw 5 instead of 2, keep 1), Prospector (draw 1).
- **All 22 violet buildings** with their effects, violet buildings unique per player, library
  doubles privileges (2 players: governor only once per round).
- **End:** after a builder phase in which someone reaches 12 buildings. Score = building VP +
  chapel cards + guild hall / city hall / triumphal arch bonuses, then palace (+¼). Tie-break:
  cards in hand + goods.
- **Hidden information:** clients never receive the deck, the discard pile, goods or other
  players' hands; all moves are executed only on the host.

### Assumptions to double-check against the printed rulebook

The official PDF could not be downloaded from the development environment, so these points come
from rule summaries and should be verified:

1. Trading house tile prices (`TRADE_TILES` in `cards.ts`).
2. A building's ability works only from the action *after* it is built (e.g. a newly built
   poor house or carpenter does not trigger on its own construction).
3. Goods of the same type may be sold together.
4. Guild hall = 2 VP per production building (first edition; the 2nd edition differs).
5. Gold mine needs 4 revealed cards with 4 different costs; its card pick is mandatory.

## Signaling

WebRTC needs a signaling step to introduce peers. PeerJS uses its free public cloud server
(`0.peerjs.com`) by default — no server of your own is required. To use a different one, copy
`.env.example` to `.env` and set `VITE_PEER_*`.

Notes / limitations (from the P2P transport itself):
- Game state lives in the host's tab. If the host reloads, the match is lost.
- Peers on very restrictive networks (symmetric NAT) may need a TURN server, configurable via
  PeerJS `config.iceServers`.
- React `StrictMode` is deliberately not used, as its double-mount re-registers the host peer ID.
