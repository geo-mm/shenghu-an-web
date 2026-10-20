import { useEffect, useMemo, useState } from 'react'
import { Client } from 'boardgame.io/client'
import { Local } from 'boardgame.io/multiplayer'
import type { BotLevel } from '../game/ai'
import { legalActions } from '../game/bot'
import { tableCtx } from '../game/engine'
import { HOST_SEAT, createSanJuanGame } from '../game/SanJuanGame'
import type { ClientState, MatchPlayer } from '../hooks/useP2PMatch'
import { Board } from './Board'
import { loadProfilePref } from './Players'

const BOT_DELAY_MS = 500

interface Props {
  numPlayers: number
  expansion: boolean
  /** A bot plays my seat too (random legal actions), for watching whole games. */
  auto: boolean
  level: BotLevel
}

/**
 * Local preview of the game table (`?demo=N`, optionally `&expansion`, `&level=boss`, `&auto`):
 * a room where I sit at seat 0 and computer players fill the others, all in this browser.
 */
export function DemoTable({ numPlayers, expansion, auto, level }: Props) {
  const client = useMemo(
    () => Client({ game: createSanJuanGame({ expansion, lobby: true }), numPlayers, multiplayer: Local(), playerID: HOST_SEAT }),
    [numPlayers, expansion],
  )
  const [state, setState] = useState<ClientState | null>(null)

  useEffect(() => {
    client.start()
    const unsubscribe = client.subscribe((s) => s && setState(s))
    const pref = loadProfilePref()
    if (pref) client.moves.setProfile(pref)
    const bots = Array.from({ length: numPlayers - 1 }, (_, i) => String(i + 1))
    bots.forEach((b) => client.moves.setBot(b, level))
    client.moves.startGame({ humans: [HOST_SEAT], bots })
    return () => {
      unsubscribe()
      client.stop()
    }
  }, [client, numPlayers, level])

  // Computer seats (and mine with &auto) move after a short pause.
  const step = state && state.G.started && !state.ctx.gameover ? state._stateID : null
  useEffect(() => {
    if (step === null || !state) return
    const { G } = state
    const mine = G.actor === HOST_SEAT
    if (mine && !auto) return
    const timer = window.setTimeout(
      () => {
        if (!mine) return client.moves.botTurn()
        const options = legalActions(G, tableCtx(G))
        const real = options.filter((o) => o.move !== 'pass')
        const pool = real.length ? real : options
        const choice = pool[Math.floor(Math.random() * pool.length)]
        if (choice) client.moves[choice.move](...choice.args)
      },
      auto ? BOT_DELAY_MS / 5 : BOT_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
    // `step` changes with every new state, so `state` is current here.
  }, [step, client, auto])

  if (!state?.G.started) return null
  const players = state.G.seats.map((p) => ({ id: Number(p), isConnected: true }) as MatchPlayer)
  return <Board state={state} playerID={HOST_SEAT} players={players} moves={client.moves as Record<string, (...args: unknown[]) => void>} />
}
