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
3. Press *Draw Card* on whichever screen has the turn; the card, turn counter and state ID
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

To check the table layout without a second browser, open `?demo=N` (N = 2–4, add `&expansion`
for the new buildings): you play seat 0 against simple bots, all locally. `&auto` lets a bot
play your seat too. `?gallery` shows every card.

## How it fits together

| File | Purpose |
| --- | --- |
| `src/game/cards.ts` | Card data: 29 base buildings (110 cards) and the expansion's buildings, with cost, VP and counts; roles; trading house tiles. |
| `src/game/state.ts` | Game state types (`SanJuanState`, players, step machine, scores). |
| `src/game/engine.ts` | The rules: pure functions for every decision (`act*`), automatic flow (`advance`), costs/limits and scoring. |
| `src/game/SanJuanGame.ts` | boardgame.io wrapper: moves (host-only, `client: false`), turn order follows `G.actor`, `playerView` hides secret cards. |
| `src/game/players.ts` | Player colours and icons: choices, defaults, the unique-colour rule (`setProfile` may be sent at any time). |
| `src/game/bot.ts` | Lists legal actions; used by tests to play full random games (and a future AI). |
| `src/game/engine.test.ts`, `expansion.test.ts` | Unit tests for every rule and building, plus 90 complete random 2–4 player games with and without the expansion (`npm test`). |
| `src/hooks/useP2PMatch.ts` | Creates the boardgame.io client with `P2P({ isHost })`, exposes state, player list and connection status. |
| `src/components/Lobby.tsx`, `ConnectionStatus.tsx` | Host / join UI and live connection status. |
| `src/components/Board.tsx`, `CardView.tsx` | The game table on one screen: opponents' seats around the edge, roles and status in the middle, the action box and log at the side, my buildings and hand (overlapping to fit) along the bottom. |
| `src/components/DemoTable.tsx` | `?demo=N`: a local game against bots, for trying the layout with 2–4 players. |
| `src/components/CardInfo.tsx` | Card details dialog, opened by right-click (or long-press on phones). |
| `src/i18n/` | English / Traditional Chinese UI text, card names and effects; the choice is remembered per browser. Game logs are structured, so each player reads them in their own language. |

The room token is the boardgame.io `matchID`; the P2P transport derives the host's PeerJS ID
from it, so the guest can find the host with just the token. The host is player `0`, the guest
player `1`. The lobby currently seats 2 players; the rules engine supports 2–4.

## Rules implemented (San Juan, second edition)

- **Setup:** each player gets an indigo plant in play and 4 cards; random governor.
- **Round:** governor phase (chapel, bank, hand limit) → each player picks one role in turn
  (2 players: governor, opponent, governor again) → everyone resolves it clockwise from the
  chooser, who gets the privilege. The governor then passes left.
- **Roles:** Builder (−1 card), Producer (+1 good), Trader (+1 good, trading house tile cycles
  top → bottom), Councillor (draw 5 instead of 2, keep 1), Prospector (draw 1).
- **Base game:** all 110 cards; violet buildings are unique per player; library doubles
  privileges (2 players: the governor may use it only once per round — confirmed by several rule
  sources; not using it on the first turn keeps it available for the second). Second-edition rules: prefecture costs 4,
  the gold mine automatically keeps the cheapest of 4 differently-priced cards, and the guild hall
  scores 1 VP per production building plus 1 VP per different kind.
- **Card data** (costs, VP, trading house tiles, zh-TW names) was checked against the Traditional
  Chinese second edition.
- **“New Buildings” expansion (optional, chosen by the host):** all 34 cards — office building,
  guard room, hut, tavern, bank, customs office, park, harbor, goldsmith, residence, cathedral,
  plus 4 extra production buildings. The office building swap happens at the start of the round,
  before the hand limit is checked.
- **End:** after a builder phase in which someone reaches 12 buildings. Score = building VP +
  cards under the chapel / in the bank / under the harbor + guild hall, city hall, triumphal
  arch, residence and cathedral bonuses, then palace (+¼). Tie-break: cards in hand + goods.
- **Hidden information:** clients never receive the deck, the discard pile, goods, banked cards
  or other players' hands; all moves are executed only on the host.

### Interpretations to double-check

1. A building's ability works only from the action *after* it is built.
2. Goods of the same type may be sold together.
3. Gold mine: fewer than 4 cards left in deck and discard counts as a miss.
4. Tavern: ties for the fewest buildings count as “fewest”.
5. Cathedral counts the cost-6 buildings of all opponents together.
6. Residence: a set is 3 different building types with the same cost; each building is used once.
7. Customs office receives a good on its owner's councillor turn only if it is empty; the
   customs good also counts as a good for the black market, market stand and tie-break.
8. Harbor: one sold good is always kept (automatic). Goldsmith: the turned-up card is discarded
    if any player, including you, already has that building.

## Card art

Cards are laid out like the physical cards (cost medallions, 4:3 art, name ribbon, effect text,
VP badge). Artwork is optional and added one image at a time: prompts for ChatGPT are in
[`docs/card-art-prompts.md`](docs/card-art-prompts.md); put the downloaded images in `art-src/`
(git-ignored) and run `npm run art`, which crops, compresses and keys out the magenta backgrounds
into `src/assets/art/`. Missing images fall back to the CSS-drawn card.

Each player picks one of 8 colours (unique per game) and 8 icons, in the lobby or during the game
by clicking their own token; the choice is remembered per browser and sent when the game starts.
The colour marks their seat, their name in the log and the badge on roles they chose this round.
Optional icon art `icon-anchor.png` … `icon-fish.png` (magenta background) replaces the emoji glyphs.

## Signaling

WebRTC needs a signaling step to introduce peers. PeerJS uses its free public cloud server
(`0.peerjs.com`) by default — no server of your own is required. To use a different one, copy
`.env.example` to `.env` and set `VITE_PEER_*`.

Notes / limitations (from the P2P transport itself):
- Game state lives in the host's tab. If the host reloads, the match is lost.
- Peers on very restrictive networks (symmetric NAT) may need a TURN server, configurable via
  PeerJS `config.iceServers`.
- React `StrictMode` is deliberately not used, as its double-mount re-registers the host peer ID.
