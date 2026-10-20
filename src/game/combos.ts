/**
 * Data for the optional combo hints: which buildings strengthen each other,
 * and what adds up in each phase for a player. Texts live in i18n.
 */
import { BUILDINGS, cardDef, type BuildingType, type RoleId } from './cards'
import { councilKeeps, owns, privilegeFactor, type EngineCtx } from './engine'
import type { PlayerID, PlayerState, SanJuanState } from './state'

/** A side of a combo: one building, or any building of a group. */
type Side = BuildingType | 'production' | 'violet' | 'monument' | 'cost6'

export const COMBOS = [
  { id: 'smithyProduction', a: 'smithy', b: 'production' },
  { id: 'quarryViolet', a: 'quarry', b: 'violet' },
  { id: 'carpenterViolet', a: 'carpenter', b: 'violet' },
  { id: 'quarryCarpenter', a: 'quarry', b: 'carpenter' },
  { id: 'libraryAqueduct', a: 'library', b: 'aqueduct' },
  { id: 'libraryTradingPost', a: 'library', b: 'trading_post' },
  { id: 'libraryPrefecture', a: 'library', b: 'prefecture' },
  { id: 'aqueductWell', a: 'aqueduct', b: 'well' },
  { id: 'tradingPostMarketStand', a: 'trading_post', b: 'market_stand' },
  { id: 'tradingPostMarketHall', a: 'trading_post', b: 'market_hall' },
  { id: 'marketStandHall', a: 'market_stand', b: 'market_hall' },
  { id: 'prefectureArchive', a: 'prefecture', b: 'archive' },
  { id: 'towerChapel', a: 'tower', b: 'chapel' },
  { id: 'towerPrefecture', a: 'tower', b: 'prefecture' },
  { id: 'blackMarketProduction', a: 'black_market', b: 'production' },
  { id: 'craneCost6', a: 'crane', b: 'cost6' },
  { id: 'cranePark', a: 'crane', b: 'park' },
  { id: 'guildHallProduction', a: 'guild_hall', b: 'production' },
  { id: 'cityHallViolet', a: 'city_hall', b: 'violet' },
  { id: 'triumphalArchMonument', a: 'triumphal_arch', b: 'monument' },
  { id: 'customsTradingPost', a: 'customs_office', b: 'trading_post' },
  { id: 'harborTradingPost', a: 'harbor', b: 'trading_post' },
  { id: 'goldsmithGoldMine', a: 'goldsmith', b: 'gold_mine' },
  { id: 'bankChapel', a: 'bank', b: 'chapel' },
  { id: 'officeTower', a: 'office_building', b: 'tower' },
] as const satisfies readonly { id: string; a: Side; b: Side }[]

export type ComboId = (typeof COMBOS)[number]['id']

function matches(type: BuildingType, side: Side): boolean {
  const def = BUILDINGS[type]
  if (side === 'production') return def.kind === 'production'
  if (side === 'violet') return def.kind === 'violet' && !def.monument
  if (side === 'monument') return !!def.monument
  if (side === 'cost6') return def.cost === 6
  return side === type
}

/** Combos between a building of type `type` and another building `player` already owns, with that partner. */
export function combosFor(player: PlayerState, type: BuildingType): { id: ComboId; partner: BuildingType }[] {
  const owned = [...new Set(player.buildings.map((b) => cardDef(b.card).type))].filter((o) => o !== type)
  const found: { id: ComboId; partner: BuildingType }[] = []
  for (const combo of COMBOS) {
    const partner =
      (matches(type, combo.a) && owned.find((o) => matches(o, combo.b))) ||
      (matches(type, combo.b) && owned.find((o) => matches(o, combo.a)))
    if (partner) found.push({ id: combo.id, partner })
  }
  return found
}

/** Where a bonus in a phase comes from. */
export type BoostSource = 'base' | 'privilege' | 'library' | BuildingType

export interface PhaseBoosts {
  role: RoleId
  /** The headline numbers (what the phase gives, e.g. goods to produce). */
  total: { a: number; b?: number } | null
  sources: { source: BoostSource; amount?: number }[]
}

/**
 * What adds up for `p` in a role phase: the base action, the privilege (if
 * `asChooser`), the library doubling it, and `p`'s buildings that apply.
 */
export function phaseBoosts(G: SanJuanState, ctx: EngineCtx, p: PlayerID, role: RoleId, asChooser: boolean): PhaseBoosts {
  const player = G.players[p]
  const factor = asChooser ? privilegeFactor(G, ctx, p) : 0
  const sources: PhaseBoosts['sources'] = []
  const add = (source: BoostSource, amount?: number) => sources.push({ source, amount })
  const own = (type: BuildingType) => owns(player, type)
  if (factor > 0) add('privilege', role === 'councillor' ? 3 : 1)
  if (factor > 1) add('library', role === 'councillor' ? 3 : 1)
  let total: PhaseBoosts['total'] = null
  switch (role) {
    case 'builder':
      for (const b of ['smithy', 'quarry', 'crane', 'black_market', 'poor_house', 'carpenter'] as const) if (own(b)) add(b)
      total = { a: factor }
      break
    case 'producer':
      sources.unshift({ source: 'base', amount: 1 })
      if (own('aqueduct')) add('aqueduct', 1)
      if (own('well')) add('well')
      total = { a: 1 + factor + (own('aqueduct') ? 1 : 0) }
      break
    case 'trader':
      sources.unshift({ source: 'base', amount: 1 })
      for (const b of ['trading_post', 'market_stand', 'market_hall', 'customs_office', 'harbor'] as const) if (own(b)) add(b, b === 'trading_post' ? 1 : undefined)
      total = { a: 1 + factor + (own('trading_post') ? 1 : 0) }
      break
    case 'councillor':
      sources.unshift({ source: 'base' })
      if (own('prefecture')) add('prefecture', 1)
      if (own('archive')) add('archive')
      total = { a: factor === 0 ? 2 : factor === 1 ? 5 : 8, b: councilKeeps(player) }
      break
    case 'prospector':
      for (const b of ['gold_mine', 'goldsmith'] as const) if (own(b)) add(b)
      total = { a: factor }
      break
  }
  return { role, total, sources }
}
