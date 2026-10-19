import { useEffect, useMemo, useState } from 'react'
import { Client } from 'boardgame.io/client'
import { Local } from 'boardgame.io/multiplayer'
import { createSanJuanGame } from '../game/SanJuanGame'
import { legalActions } from '../game/bot'
import type { ClientState, MatchPlayer } from '../hooks/useP2PMatch'
import { Board } from './Board'

const BOT_DELAY_MS = 500

/**
 * Local preview of the game table (`?demo=N`, optionally `&expansion`):
 * I play seat 0 and simple bots play the others, all in this browser
 * (with `&auto`, a bot plays my seat too).
 */
export function DemoTable({ numPlayers, expansion, auto }: { numPlayers: number; expansion: boolean; auto: boolean }) {
  const clients = useMemo(() => {
    const game = createSanJuanGame({ expansion })
    const multiplayer = Local()
    return Array.from({ length: numPlayers }, (_, i) => Client({ game, numPlayers, multiplayer, playerID: String(i) }))
  }, [numPlayers, expansion])
  const [state, setState] = useState<ClientState | null>(null)

  useEffect(() => {
    clients.forEach((c) => c.start())
    const unsubscribe = clients[0].subscribe((s) => s && setState(s))
    // Each bot moves a moment after it becomes its turn.
    let rng = 12345
    const timers = clients.slice(auto ? 0 : 1).map((bot) => {
      let timer: number | undefined
      const unsub = bot.subscribe((s) => {
        window.clearTimeout(timer)
        if (!s || s.ctx.gameover || s.G.actor !== bot.playerID) return
        timer = window.setTimeout(() => {
          const options = legalActions(s.G, s.ctx)
          const real = options.filter((o) => o.move !== 'pass')
          const pool = real.length > 0 ? real : options
          const choice = pool[(rng = (rng * 16807) % 2147483647) % pool.length]
          if (choice) bot.moves[choice.move](...choice.args)
        }, auto ? BOT_DELAY_MS / 10 : BOT_DELAY_MS)
      })
      return () => {
        window.clearTimeout(timer)
        unsub()
      }
    })
    return () => {
      unsubscribe()
      timers.forEach((stop) => stop())
      clients.forEach((c) => c.stop())
    }
  }, [clients, auto])

  if (!state) return null
  const players = clients.map((_, i) => ({ id: i, isConnected: true }) as MatchPlayer)
  return <Board state={state} playerID="0" players={players} moves={clients[0].moves as Record<string, (...args: unknown[]) => void>} />
}
