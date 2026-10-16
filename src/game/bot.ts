/**
 * Simple bot: lists a few legal actions for the acting player so tests (and,
 * later, a computer opponent) can play complete games.
 */
import { ROLES, cardDef } from './cards'
import {
  buildCost,
  councilDiscardCount,
  governorDiscardCount,
  maxGoodsPayment,
  maxProduce,
  maxSell,
  owns,
  placementError,
  type EngineCtx,
} from './engine'
import type { SanJuanState } from './state'

export type BotAction = { move: string; args: unknown[] }

export function legalActions(G: SanJuanState, ctx: EngineCtx): BotAction[] {
  const p = G.actor
  const player = G.players[p]
  const step = G.step

  switch (step.kind) {
    case 'gameOver':
      return []
    case 'governor': {
      const options: BotAction[] = []
      const tucks = owns(player, 'chapel') && player.hand.length > 0 ? [null, player.hand[0]] : [null]
      for (const tuck of tucks) {
        const rest = player.hand.filter((c) => c !== tuck)
        options.push({ move: 'governorAction', args: [tuck, rest.slice(0, governorDiscardCount(player, tuck !== null))] })
      }
      return options
    }
    case 'chooseRole':
      return ROLES.filter((r) => !G.rolesTaken.includes(r)).map((r) => ({ move: 'chooseRole', args: [r] }))
  }

  const options: BotAction[] = []
  switch (step.role) {
    case 'builder': {
      const replaceOptions: (number | null)[] = [null]
      if (owns(player, 'crane')) player.buildings.forEach((_, i) => replaceOptions.push(i))
      const goodsIdx = player.buildings.flatMap((b, i) => (b.good !== null ? [i] : []))
      for (const card of player.hand) {
        for (const replace of replaceOptions) {
          if (placementError(player, card, replace)) continue
          const cost = buildCost(G, ctx, p, card, replace)
          const goods = goodsIdx.slice(0, Math.min(cost, maxGoodsPayment(player)))
          const payment = player.hand.filter((c) => c !== card).slice(0, cost - goods.length)
          if (payment.length + goods.length === cost) options.push({ move: 'build', args: [{ card, payment, goods, replace }] })
        }
      }
      options.push({ move: 'pass', args: [] })
      return options
    }
    case 'producer': {
      const empty = player.buildings.flatMap((b, i) => (b.good === null && cardDef(b.card).kind === 'production' ? [i] : []))
      options.push({ move: 'produce', args: [empty.slice(0, maxProduce(G, ctx, p))] })
      options.push({ move: 'pass', args: [] })
      return options
    }
    case 'trader': {
      const full = player.buildings.flatMap((b, i) => (b.good !== null ? [i] : []))
      options.push({ move: 'sell', args: [full.slice(0, maxSell(G, ctx, p))] })
      options.push({ move: 'pass', args: [] })
      return options
    }
    case 'councillor': {
      const pool = owns(player, 'archive') ? [...player.hand, ...player.pending] : player.pending
      return [{ move: 'councilDiscard', args: [pool.slice(0, councilDiscardCount(player))] }]
    }
    case 'prospector':
      return (G.reveal?.cards ?? []).map((c) => ({ move: 'goldMinePick', args: [c] }))
  }
}
