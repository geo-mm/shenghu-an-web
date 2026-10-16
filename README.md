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
| `src/game/SanJuanGame.ts` | Game definition: empty hands at setup, dummy `drawCard` move (one draw per turn). |
| `src/hooks/useP2PMatch.ts` | Creates the vanilla `boardgame.io/client` with `P2P({ isHost })`, subscribes to state, player list (`matchData`) and connection status. |
| `src/components/Lobby.tsx` | Host / Join UI and token generation. |
| `src/components/ConnectionStatus.tsx` | Live status indicator and player list. |
| `src/components/Board.tsx` | Game board; shown once both players are connected. |

The room token is the boardgame.io `matchID`; the P2P transport derives the host's PeerJS ID
from it (`boardgameio-san-juan-p2p-matchid-<TOKEN>`), so the guest can find the host with just
the token. The host is player `0`, the guest player `1`.

## Signaling

WebRTC needs a signaling step to introduce peers. PeerJS uses its free public cloud server
(`0.peerjs.com`) by default — no server of your own is required. To use a different one, copy
`.env.example` to `.env` and set `VITE_PEER_*`.

Notes / limitations (from the P2P transport itself):
- Game state lives in the host's tab. If the host reloads, the match is lost.
- Peers on very restrictive networks (symmetric NAT) may need a TURN server, configurable via
  PeerJS `config.iceServers`.
- React `StrictMode` is deliberately not used, as its double-mount re-registers the host peer ID.
