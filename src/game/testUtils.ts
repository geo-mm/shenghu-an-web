/** Helpers shared by the engine tests. */
import { cardType, type BuildingType, type CardId } from './cards'
import type { EngineCtx, Rng } from './engine'
import type { SanJuanState } from './state'

/** A "shuffle" that keeps order, so tests are deterministic. */
export const identity: Rng = { Shuffle: (a) => [...a] }

export const ctx2: EngineCtx = { numPlayers: 2, playOrder: ['0', '1'] }

/** Takes `n` cards of a building type out of the deck or players' hands, so the card count stays constant. */
export function cardsOf(G: SanJuanState, type: BuildingType, n = 1): CardId[] {
  const piles = [G.deck, ...Object.values(G.players).map((p) => p.hand)]
  const out: CardId[] = []
  for (const pile of piles) {
    for (const id of pile.filter((c) => cardType(c) === type)) {
      if (out.length === n) break
      pile.splice(pile.indexOf(id), 1)
      out.push(id)
    }
  }
  if (out.length < n) throw new Error(`not enough ${type} cards`)
  return out
}

/** Puts a building of `type` into player `p`'s play area. */
export function give(G: SanJuanState, p: string, type: BuildingType) {
  const [card] = cardsOf(G, type)
  G.players[p].buildings.push({ card, good: null })
}
