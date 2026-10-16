import { useEffect, useState } from 'react'
import { Client } from 'boardgame.io/client'
import { P2P } from '@boardgame.io/p2p'
import { SanJuanGame } from '../game/SanJuanGame'
import type { SanJuanState } from '../game/state'

export const HOST_PLAYER_ID = '0'
export const GUEST_PLAYER_ID = '1'

export interface MatchConfig {
  role: 'host' | 'guest'
  /** The room token. Used as the boardgame.io matchID, which the P2P transport turns into the host's peer ID. */
  token: string
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
  /** PeerJS error; `type` 'unavailable-id' means the room token is taken. */
  error: { type: string; message: string } | null
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
    const client = Client<SanJuanState>({
      game: SanJuanGame,
      numPlayers: 2,
      matchID: config.token,
      playerID: isHost ? HOST_PLAYER_ID : GUEST_PLAYER_ID,
      credentials: makeCredentials(),
      debug: false,
      multiplayer: P2P({
        isHost,
        peerOptions: peerOptions(),
        onError: (err: Error & { type?: string }) => {
          setMatch((m) => ({ ...m, error: { type: err.type ?? '', message: err.message } }))
        },
      }),
    })

    const sync = () =>
      setMatch((m) => ({
        ...m,
        client,
        state: client.getState(),
        players: client.matchData ?? [],
      }))

    const unsubscribe = client.subscribe(sync)
    client.start()
    setMatch({ ...emptyMatch, client, state: client.getState() })

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

    return () => {
      peer?.off?.('open', onOpen)
      unsubscribe()
      client.stop()
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
}
