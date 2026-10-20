import { useEffect, useState } from 'react'
import { Client } from 'boardgame.io/client'
import { P2P } from '@boardgame.io/p2p'
import { HOST_SEAT, MAX_SEATS, createSanJuanGame } from '../game/SanJuanGame'
import type { SanJuanState } from '../game/state'

export const HOST_PLAYER_ID = HOST_SEAT

/** How long a guest waits for the host to accept its seat before looking again (someone else may have taken it). */
const SEAT_TIMEOUT_MS = 8000

export interface MatchConfig {
  role: 'host' | 'guest'
  /** The room token. Used as the boardgame.io matchID, which the P2P transport turns into the host's peer ID. */
  token: string
  /** Host only: play with the "New Buildings" expansion. */
  expansion?: boolean
}

type SanJuanClient = ReturnType<typeof Client<SanJuanState>>
export type ClientState = NonNullable<ReturnType<SanJuanClient['getState']>>
export type MatchPlayer = NonNullable<SanJuanClient['matchData']>[number]

export interface P2PMatch {
  client: SanJuanClient | null
  state: ClientState | null
  players: MatchPlayer[]
  /** Host only: true once the PeerJS signaling server has registered our peer ID. */
  hostRegistered: boolean
  /**
   * PeerJS error; `type` 'unavailable-id' means the room token is taken. Also
   * 'game-started' / 'room-full' when a guest can't get a seat.
   */
  error: { type: string; message: string } | null
  /** My seat: the host is seat 0; a guest gets the first free seat (null while still looking). */
  playerID: string | null
}

/**
 * PeerJS signaling options. By default PeerJS uses its free public cloud
 * server (0.peerjs.com) purely to introduce peers; game data then flows
 * directly between browsers over WebRTC. Set VITE_PEER_HOST (and optionally
 * VITE_PEER_PORT / VITE_PEER_PATH / VITE_PEER_SECURE) to use another one.
 */
function peerOptions() {
  const env = import.meta.env
  if (!env.VITE_PEER_HOST) return {}
  return {
    host: env.VITE_PEER_HOST,
    port: env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : undefined,
    path: env.VITE_PEER_PATH || '/',
    secure: env.VITE_PEER_SECURE ? env.VITE_PEER_SECURE === 'true' : location.protocol === 'https:',
  }
}

/** Random per-tab secret so the host can tell this seat's owner apart from impostors. */
function makeCredentials() {
  return crypto.randomUUID()
}

/**
 * Creates and runs a boardgame.io client over the P2P transport for the given
 * config, exposing its live state, player list and connection info to React.
 */
export function useP2PMatch(config: MatchConfig | null): P2PMatch {
  const [match, setMatch] = useState<P2PMatch>(emptyMatch)

  useEffect(() => {
    if (!config) return
    const isHost = config.role === 'host'
    let stopped = false
    let stopCurrent = () => {}
    const fail = (type: string, message = '') => setMatch((m) => ({ ...m, error: { type, message } }))

    /** A client for `playerID` (null = spectator, used by guests to look at the room first). */
    const makeClient = (playerID: string | null) =>
      Client<SanJuanState>({
        // Only the host runs setup, so only its options matter. A hosted room
        // has every seat; the host starts the game with whoever is there.
        game: createSanJuanGame({ expansion: isHost && config.expansion, lobby: true }),
        numPlayers: MAX_SEATS,
        matchID: config.token,
        playerID: playerID ?? undefined,
        credentials: playerID === null ? undefined : makeCredentials(),
        debug: false,
        multiplayer: P2P({
          isHost,
          peerOptions: peerOptions(),
          onError: (err: Error & { type?: string }) => fail(err.type ?? '', err.message),
        }),
      })

    /** Plays as `playerID`: the board follows this client from now on. */
    const play = (playerID: string) => {
      const client = makeClient(playerID)
      const sync = () =>
        setMatch((m) => ({ ...m, client, playerID, state: client.getState(), players: client.matchData ?? [] }))
      const unsubscribe = client.subscribe(sync)
      client.start()
      setMatch((m) => ({ ...m, client, playerID, state: client.getState() }))

      // The P2P transport marks the host as "connected" immediately because it is
      // its own server. To show whether the room is actually reachable, listen for
      // the underlying PeerJS peer registering with the signaling server.
      // `transport.peer` is not part of the public API, hence the defensive access.
      const peer = (client as unknown as { transport?: { peer?: PeerLike | null } }).transport?.peer
      const onOpen = () => setMatch((m) => ({ ...m, hostRegistered: true }))
      if (isHost && peer) {
        if (peer.open) onOpen()
        else peer.on('open', onOpen)
      }
      // A guest whose seat was taken a moment earlier is never accepted: look again.
      const retry = isHost
        ? undefined
        : window.setTimeout(() => {
            if (!client.getState()) {
              stopCurrent()
              findSeat()
            }
          }, SEAT_TIMEOUT_MS)
      stopCurrent = () => {
        window.clearTimeout(retry)
        peer?.off?.('open', onOpen)
        unsubscribe()
        client.stop()
      }
    }

    /** Guest: look at the room as a spectator, then take the first free seat (unless the game has started). */
    const findSeat = () => {
      if (stopped) return
      const scout = makeClient(null)
      const unsubscribe = scout.subscribe((state) => {
        const seats = scout.matchData
        if (!state || !seats?.length) return
        unsubscribe()
        scout.stop()
        if (stopped) return
        if (state.G.started) return fail('game-started')
        const free = seats.find((s) => String(s.id) !== HOST_SEAT && !s.isConnected && !state.G.bots.includes(String(s.id)))
        if (!free) return fail('room-full')
        play(String(free.id))
      })
      scout.start()
      stopCurrent = () => {
        unsubscribe()
        scout.stop()
      }
    }

    setMatch(emptyMatch)
    if (isHost) play(HOST_SEAT)
    else findSeat()

    return () => {
      stopped = true
      stopCurrent()
      setMatch(emptyMatch)
    }
  }, [config])

  return match
}

interface PeerLike {
  open: boolean
  on(event: 'open', cb: () => void): void
  off?(event: 'open', cb: () => void): void
}

const emptyMatch: P2PMatch = {
  client: null,
  state: null,
  players: [],
  hostRegistered: false,
  error: null,
  playerID: null,
}
