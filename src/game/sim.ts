/**
 * Plays actions straight on a state copy (no boardgame.io), for the computer
 * player's look-ahead.
 */
import type { CardId, RoleId } from './cards'
import {
  actBuild,
  actChooseRole,
  actCouncil,
  actGovernor,
  actOfficeSwap,
  actPass,
  actProduce,
  actSell,
  advance,
  type BuildAction,
  type EngineCtx,
  type Rng,
} from './engine'
import type { BotAction } from './bot'
import type { PlayerID, SanJuanState } from './state'

/** A small seeded generator (mulberry32) with the engine's Shuffle. */
export function seededRng(seed: number): Rng & { random: () => number } {
  let a = seed >>> 0
  const random = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    random,
    Shuffle<T>(deck: T[]) {
      const out = [...deck]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
  }
}

/** Plays `action` for `p`, then lets the game flow on to the next decision. Returns an error, or null. */
export function applyAction(G: SanJuanState, ctx: EngineCtx, rng: Rng, p: PlayerID, action: BotAction): string | null {
  const a = action.args
  let err: string | null
  switch (action.move) {
    case 'governorAction':
      err = actGovernor(G, p, a[0] as CardId | null, a[1] as CardId[], (a[2] as CardId[]) ?? [])
      break
    case 'officeSwap':
      err = actOfficeSwap(G, rng, p, a[0] as CardId[])
      break
    case 'chooseRole':
      err = actChooseRole(G, ctx, p, a[0] as RoleId)
      break
    case 'build':
      err = actBuild(G, ctx, rng, p, a[0] as BuildAction)
      break
    case 'produce':
      err = actProduce(G, ctx, rng, p, a[0] as number[])
      break
    case 'sell':
      err = actSell(G, ctx, rng, p, a[0] as number[])
      break
    case 'councilDiscard':
      err = actCouncil(G, p, a[0] as CardId[])
      break
    case 'pass':
      err = actPass(G, p)
      break
    default:
      err = `Unknown move ${action.move}`
  }
  if (!err) advance(G, ctx, rng)
  return err
}

/**
 * A copy of the game as `p` might imagine it: the cards `p` can't see (deck,
 * discard pile, other players' hands and drawn cards) are reshuffled among
 * themselves, so looking ahead never peeks at hidden information.
 */
export function determinize(G: SanJuanState, p: PlayerID, rng: Rng): SanJuanState {
  const copy: SanJuanState = JSON.parse(JSON.stringify(G))
  const others = copy.seats.filter((q) => q !== p).map((q) => copy.players[q])
  const pool = rng.Shuffle([...copy.deck, ...copy.discard, ...others.flatMap((o) => [...o.hand, ...o.pending])])
  const take = (n: number) => pool.splice(0, n)
  copy.deck = take(copy.deck.length)
  copy.discard = take(copy.discard.length)
  for (const o of others) {
    o.hand = take(o.hand.length)
    o.pending = take(o.pending.length)
  }
  return copy
}
