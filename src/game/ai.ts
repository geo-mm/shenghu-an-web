/**
 * Computer player: picks one action for the acting seat from the full game
 * state (only the host has it). Simple, greedy heuristics: choose the role
 * that is worth most right now, build the best affordable building, produce
 * and sell the most valuable goods, and always give away the least useful cards.
 */
import { GOODS, ROLES, cardDef, type CardId, type RoleId } from './cards'
import {
  buildCost,
  councilDiscardCount,
  governorDiscardCount,
  maxProduce,
  maxSell,
  needsOfficeSwap,
  owns,
  placementError,
  sellPrice,
  type EngineCtx,
} from './engine'
import type { BotAction } from './bot'
import type { PlayerID, PlayerState, SanJuanState } from './state'

/** Rough average price of each good over the trading house tiles. */
const AVG_PRICE = { indigo: 1, sugar: 1.4, tobacco: 1.8, coffee: 2.2, silver: 2.6 } as const

/** How much `p` would like to build `card` some day (higher is better; negative = can't build it). */
function cardValue(G: SanJuanState, p: PlayerID, card: CardId): number {
  const player = G.players[p]
  const def = cardDef(card)
  if (def.kind === 'violet' && player.buildings.some((b) => cardDef(b.card).type === def.type)) return -1
  const late = player.buildings.length >= 8
  let v = def.vp + def.cost * 0.4
  if (def.bonus) v += 3
  // Early on, buildings that keep paying off (production, violet effects) are worth more.
  if (!late && !def.monument) v += def.kind === 'production' ? 1 : 1.2
  return v
}

/** Cards sorted from least to most useful to `p`, for paying and discarding. */
function worstFirst(G: SanJuanState, p: PlayerID, cards: CardId[]): CardId[] {
  return [...cards].sort((a, b) => cardValue(G, p, a) - cardValue(G, p, b))
}

/** The best building `p` can afford now, with the cards to pay for it. */
function bestBuild(G: SanJuanState, ctx: EngineCtx, p: PlayerID, discount = 0) {
  const player = G.players[p]
  let best: { card: CardId; payment: CardId[]; value: number } | null = null
  for (const card of player.hand) {
    if (placementError(player, card, null)) continue
    const value = cardValue(G, p, card)
    if (value < 0) continue
    const cost = Math.max(0, buildCost(G, ctx, p, card, null) - discount)
    const others = player.hand.filter((c) => c !== card)
    if (others.length < cost) continue
    if (!best || value > best.value) best = { card, payment: worstFirst(G, p, others).slice(0, cost), value }
  }
  return best
}

function roleValue(G: SanJuanState, ctx: EngineCtx, p: PlayerID, role: RoleId): number {
  const player = G.players[p]
  const goods = player.buildings.filter((b) => b.good !== null)
  const empty = player.buildings.filter((b) => b.good === null && cardDef(b.card).kind === 'production')
  switch (role) {
    case 'builder': {
      // Privilege: one card cheaper while building in this phase.
      const build = bestBuild(G, ctx, p, 1)
      return build ? 2 + build.value : 0
    }
    case 'producer': {
      const n = Math.min(empty.length, 2 + (owns(player, 'aqueduct') ? 1 : 0))
      const values = empty.map((b) => AVG_PRICE[cardDef(b.card).good!]).sort((a, b) => b - a)
      return values.slice(0, n).reduce((s, v) => s + v, 0) * 0.8
    }
    case 'trader': {
      const n = Math.min(goods.length, 2 + (owns(player, 'trading_post') ? 1 : 0))
      const values = goods.map((b) => AVG_PRICE[cardDef(b.card).good ?? 'tobacco']).sort((a, b) => b - a)
      return values.slice(0, n).reduce((s, v) => s + v, 0)
    }
    case 'councillor':
      return player.hand.length < 3 ? 2.5 : 1.5
    case 'prospector':
      return 1
  }
}

/** One action for the acting player (G.actor), or null if there is nothing to decide. */
export function chooseBotAction(G: SanJuanState, ctx: EngineCtx, random: () => number): BotAction | null {
  const p = G.actor
  const player: PlayerState = G.players[p]
  const step = G.step

  switch (step.kind) {
    case 'gameOver':
      return null
    case 'governor': {
      if (needsOfficeSwap(G, p)) {
        const worst = worstFirst(G, p, player.hand).slice(0, 1)
        return { move: 'officeSwap', args: [worst] }
      }
      // Tuck the least useful card under the chapel when the hand is comfortable.
      const tuck = owns(player, 'chapel') && player.hand.length > 3 ? worstFirst(G, p, player.hand)[0] : null
      const rest = worstFirst(G, p, player.hand.filter((c) => c !== tuck))
      const discards = rest.slice(0, governorDiscardCount(G, player, tuck !== null, 0))
      return { move: 'governorAction', args: [tuck, discards, []] }
    }
    case 'chooseRole': {
      const free = ROLES.filter((r) => !G.rolesTaken.includes(r))
      // A little noise so bots don't all play exactly alike.
      const scored = free.map((r) => ({ r, v: roleValue(G, ctx, p, r) + random() * 0.6 }))
      scored.sort((a, b) => b.v - a.v)
      return { move: 'chooseRole', args: [scored[0].r] }
    }
  }

  switch (step.role) {
    case 'builder': {
      const build = bestBuild(G, ctx, p)
      return build ? { move: 'build', args: [{ card: build.card, payment: build.payment, goods: [], replace: null }] } : { move: 'pass', args: [] }
    }
    case 'producer': {
      const empty = player.buildings
        .flatMap((b, i) => (b.good === null && cardDef(b.card).kind === 'production' ? [i] : []))
        .sort((a, b) => GOODS.indexOf(cardDef(player.buildings[b].card).good!) - GOODS.indexOf(cardDef(player.buildings[a].card).good!))
      const chosen = empty.slice(0, maxProduce(G, ctx, p))
      return chosen.length ? { move: 'produce', args: [chosen] } : { move: 'pass', args: [] }
    }
    case 'trader': {
      const full = player.buildings
        .flatMap((b, i) => (b.good !== null ? [i] : []))
        .sort((a, b) => sellPrice(G, player.buildings[b].card) - sellPrice(G, player.buildings[a].card))
      const chosen = full.slice(0, maxSell(G, ctx, p))
      return chosen.length ? { move: 'sell', args: [chosen] } : { move: 'pass', args: [] }
    }
    case 'councillor': {
      const pool = owns(player, 'archive') ? [...player.hand, ...player.pending] : player.pending
      // Keep the best cards; with a full hand, discard more of the weak ones first.
      const discards = worstFirst(G, p, pool).slice(0, councilDiscardCount(player))
      return { move: 'councilDiscard', args: [discards] }
    }
    case 'prospector':
      return null
  }
}
