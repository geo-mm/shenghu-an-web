import { describe, expect, it } from 'vitest'
import { Client } from 'boardgame.io/client'
import { Local } from 'boardgame.io/multiplayer'
import { chooseBotAction } from './ai'
import { legalActions } from './bot'
import { deckCards } from './cards'
import { countAllCards, tableCtx } from './engine'
import { createSanJuanGame } from './SanJuanGame'
import type { SanJuanState } from './state'

type AnyClient = ReturnType<typeof Client<SanJuanState>>
/** The raw (unfiltered) state the host's master holds. */
const raw = (c: AnyClient) => (c as unknown as { store: { getState(): ReturnType<AnyClient['getState']> } }).store.getState()!

function room(expansion = false) {
  const game = createSanJuanGame({ expansion, lobby: true })
  const multiplayer = Local()
  const clients = ['0', '1', '2', '3'].map((playerID) => Client({ game, numPlayers: 4, multiplayer, playerID }))
  clients.forEach((c) => c.start())
  return clients
}

describe('hosted room with bots', () => {
  it('waits, lets only the host add bots and start, then locks the seats', () => {
    const [host, guest] = room()
    expect(host.getState()!.G.started).toBe(false)

    guest.moves.setBot('2', true) // not the host: ignored
    expect(host.getState()!.G.bots).toEqual([])
    host.moves.setBot('2', true)
    host.moves.setBot('3', true)
    host.moves.setBot('3', false)
    expect(host.getState()!.G.bots).toEqual(['2'])

    guest.moves.startGame({ humans: ['0', '1'], bots: ['2'] }) // not the host: ignored
    expect(host.getState()!.G.started).toBe(false)
    host.moves.startGame({ humans: ['0'], bots: [] }) // a game needs 2 players
    expect(host.getState()!.G.started).toBe(false)

    host.moves.startGame({ humans: ['0', '1'], bots: ['2'] })
    const G = host.getState()!.G
    expect(G.started).toBe(true)
    expect(G.seats).toEqual(['0', '1', '2'])
    expect(Object.keys(G.players)).toEqual(['0', '1', '2'])
    expect(G.bots).toEqual(['2'])
    expect(countAllCards(raw(host).G)).toBe(deckCards(false).length)

    // Once started, the seating can't change.
    host.moves.setBot('3', true)
    host.moves.startGame({ humans: ['0', '1', '3'], bots: [] })
    expect(host.getState()!.G.seats).toEqual(['0', '1', '2'])
    expect(host.getState()!.G.bots).toEqual(['2'])
  })

  for (const expansion of [false, true])
    it(`plays a whole game with bots driven by the host${expansion ? ' (expansion)' : ''}`, () => {
      const clients = room(expansion)
      const [host] = clients
      host.moves.setBot('1', true)
      host.moves.setBot('3', true)
      host.moves.startGame({ humans: ['0', '2'], bots: ['1', '3'] })
      let rng = 7
      for (let i = 0; i < 3000 && !host.getState()!.ctx.gameover; i++) {
        const { G } = raw(host)
        if (G.bots.includes(G.actor)) host.moves.botTurn()
        else {
          // People: random legal actions from their own view of the game.
          const me = clients[Number(G.actor)]
          const view = me.getState()!
          const options = legalActions(view.G, tableCtx(view.G)).filter((o) => o.move !== 'pass')
          const all = options.length ? options : legalActions(view.G, tableCtx(view.G))
          const choice = all[(rng = (rng * 16807) % 2147483647) % all.length]
          me.moves[choice.move](...choice.args)
        }
      }
      const end = host.getState()!
      expect(end.ctx.gameover).toBeTruthy()
      expect(end.G.scores).toHaveLength(4)
      expect(countAllCards(raw(host).G)).toBe(deckCards(expansion).length)
      clients.forEach((c) => c.stop())
    }, 60_000)
})

describe('computer player', () => {
  it('beats random play most of the time', () => {
    let wins = 0
    const games = 20
    for (let seed = 1; seed <= games; seed++) {
      const client = Client({ game: { ...createSanJuanGame(), seed: `ai-${seed}` }, numPlayers: 2 })
      client.start()
      let rng = seed * 31
      for (let i = 0; i < 3000 && !client.getState()!.ctx.gameover; i++) {
        const { G, ctx } = raw(client)
        // Seat 0 is the AI, seat 1 plays random legal actions.
        const choice =
          G.actor === '0'
            ? chooseBotAction(G, tableCtx(G), () => ((rng = (rng * 16807) % 2147483647) % 1000) / 1000)
            : (() => {
                const options = legalActions(G, ctx)
                const real = options.filter((o) => o.move !== 'pass')
                const pool = real.length ? real : options
                return pool[(rng = (rng * 16807) % 2147483647) % pool.length]
              })()
        client.moves[choice!.move](...choice!.args)
      }
      if (client.getState()!.G.winners?.includes('0')) wins++
      client.stop()
    }
    expect(wins).toBeGreaterThanOrEqual(15)
  }, 60_000)
})
