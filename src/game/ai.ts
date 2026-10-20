/**
 * Computer player: picks one action for the acting seat. It runs on the host,
 * which holds the full game state, but it only uses what that seat could know:
 * the stronger levels reshuffle the hidden cards before looking ahead.
 *
 * - beginner: often plays any legal action at random
 * - player:   greedy heuristics (best role now, best affordable building,
 *             most valuable goods first, give away the least useful cards)
 * - expert:   tries each sensible option and plays the rest of the round out
 *             (with the greedy policy for everyone) a few times, keeping the best
 * - boss:     the same with more samples and looking a round further ahead
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
  scorePlayer,
  sellPrice,
  type EngineCtx,
} from './engine'
import { legalActions, type BotAction } from './bot'
import { applyAction, determinize, seededRng } from './sim'
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

export const BOT_LEVELS = ['beginner', 'player', 'expert', 'boss'] as const
export type BotLevel = (typeof BOT_LEVELS)[number]
export const isBotLevel = (x: unknown): x is BotLevel => BOT_LEVELS.includes(x as BotLevel)

/** Look-ahead settings: samples per option, and how many rounds after this one to play out. */
const SEARCH: Partial<Record<BotLevel, { samples: number; extraRounds: number }>> = {
  expert: { samples: 4, extraRounds: 1 },
  boss: { samples: 12, extraRounds: 2 },
}

/** One action for the acting player (G.actor) at the given level, or null if there is nothing to decide. */
export function chooseBotAction(G: SanJuanState, ctx: EngineCtx, random: () => number, level: BotLevel = 'player'): BotAction | null {
  if (level === 'beginner' && random() < 0.5) {
    const options = legalActions(G, ctx)
    if (options.length) return options[Math.floor(random() * options.length)]
  }
  const search = SEARCH[level]
  if (!search) return greedyAction(G, ctx, random, level === 'beginner' ? 2.5 : 0.6)
  const options = candidates(G, ctx, random)
  if (options.length <= 1) return options[0] ?? null
  return lookAhead(G, ctx, random, options, search.samples, search.extraRounds)
}

/** How good the position is for `p`: points so far plus what cards, goods and production are worth. */
function evaluate(G: SanJuanState, p: PlayerID): number {
  const score = scorePlayer(G, p)
  if (G.step.kind === 'gameOver') return score.total + score.tiebreak * 0.01
  const player = G.players[p]
  const goods = player.buildings.filter((b) => b.good !== null).length
  const production = player.buildings.filter((b) => cardDef(b.card).kind === 'production').length
  return score.total + player.hand.length * 0.5 + goods * 0.6 + production * 0.3
}

/** Tries each option on reshuffled copies of the game, plays on with the greedy policy, and keeps the best. */
function lookAhead(G: SanJuanState, ctx: EngineCtx, random: () => number, options: BotAction[], samples: number, extraRounds: number) {
  const p = G.actor
  const totals = options.map(() => 0)
  for (let s = 0; s < samples; s++) {
    // The same reshuffle for every option, so they are compared on equal terms.
    const seed = Math.floor(random() * 2 ** 31)
    const base = determinize(G, p, seededRng(seed))
    options.forEach((option, i) => {
      const sim: SanJuanState = JSON.parse(JSON.stringify(base))
      const rng = seededRng(seed + 1)
      if (applyAction(sim, ctx, rng, p, option)) {
        totals[i] = -Infinity
        return
      }
      const endRound = G.round + extraRounds
      for (let steps = 0; steps < 400 && sim.step.kind !== 'gameOver' && sim.round <= endRound; steps++) {
        const next = greedyAction(sim, ctx, rng.random, 0.3)
        if (!next || applyAction(sim, ctx, rng, sim.actor, next)) break
      }
      const opponents = sim.seats.filter((q) => q !== p).map((q) => evaluate(sim, q))
      totals[i] += evaluate(sim, p) - Math.max(...opponents)
    })
  }
  return options[totals.indexOf(Math.max(...totals))]
}

/** The sensible options worth comparing at this decision. */
function candidates(G: SanJuanState, ctx: EngineCtx, random: () => number): BotAction[] {
  const p = G.actor
  const player = G.players[p]
  const greedy = greedyAction(G, ctx, random, 0)
  const step = G.step
  if (step.kind === 'chooseRole') return ROLES.filter((r) => !G.rolesTaken.includes(r)).map((r) => ({ move: 'chooseRole', args: [r] }))
  if (step.kind === 'role' && step.role === 'builder') {
    const options: BotAction[] = [{ move: 'pass', args: [] }]
    const replaceOptions: (number | null)[] = [null, ...(owns(player, 'crane') ? player.buildings.map((_, i) => i) : [])]
    for (const card of player.hand) {
      if (cardValue(G, p, card) < 0) continue
      for (const replace of replaceOptions) {
        if (placementError(player, card, replace)) continue
        const cost = buildCost(G, ctx, p, card, replace)
        const others = player.hand.filter((c) => c !== card)
        if (others.length < cost) continue
        options.push({ move: 'build', args: [{ card, payment: worstFirst(G, p, others).slice(0, cost), goods: [], replace }] })
      }
    }
    return options
  }
  if (step.kind === 'governor' && greedy?.move === 'governorAction' && owns(player, 'chapel')) {
    // With a chapel: compare tucking a card with keeping it.
    const rest = worstFirst(G, p, player.hand)
    const noTuck: BotAction = { move: 'governorAction', args: [null, rest.slice(0, governorDiscardCount(G, player, false, 0)), []] }
    return [greedy, noTuck]
  }
  return greedy ? [greedy] : []
}

/** The greedy policy; `noise` adds randomness to the role choice so bots don't all play alike. */
function greedyAction(G: SanJuanState, ctx: EngineCtx, random: () => number, noise: number): BotAction | null {
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
      const scored = free.map((r) => ({ r, v: roleValue(G, ctx, p, r) + random() * noise }))
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
