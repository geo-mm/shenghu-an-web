/**
 * San Juan card data (first edition base game, 110 cards).
 * Names and effect texts are translated in src/i18n/messages.ts.
 *
 * Every card is a building. Cards in hand double as money (pay a building's
 * cost by discarding that many cards) and, placed face down on a production
 * building, as goods.
 */

export type GoodType = 'indigo' | 'sugar' | 'tobacco' | 'coffee' | 'silver'

export const GOODS: readonly GoodType[] = ['indigo', 'sugar', 'tobacco', 'coffee', 'silver']

export type BuildingType =
  // Production buildings
  | 'indigo_plant'
  | 'sugar_mill'
  | 'tobacco_storage'
  | 'coffee_roaster'
  | 'silver_smelter'
  // Violet buildings with a special function
  | 'smithy'
  | 'gold_mine'
  | 'archive'
  | 'poor_house'
  | 'black_market'
  | 'trading_post'
  | 'well'
  | 'market_stand'
  | 'crane'
  | 'chapel'
  | 'tower'
  | 'aqueduct'
  | 'carpenter'
  | 'prefecture'
  | 'market_hall'
  | 'quarry'
  | 'library'
  // Monuments (victory points only)
  | 'statue'
  | 'victory_column'
  | 'hero'
  // Cost-6 buildings (end-of-game bonus)
  | 'guild_hall'
  | 'city_hall'
  | 'triumphal_arch'
  | 'palace'

/** Phase in which a violet building's function applies. */
export type BuildingPhase = 'governor' | 'builder' | 'producer' | 'trader' | 'councillor' | 'prospector' | 'all' | 'end'

export interface BuildingDef {
  type: BuildingType
  kind: 'production' | 'violet'
  cost: number
  /** Printed victory points (the cost-6 buildings score through `bonus` instead). */
  vp: number
  /** Number of copies in the deck. */
  count: number
  /** Good produced (production buildings only). */
  good?: GoodType
  /** When a violet building's function applies. */
  phase?: BuildingPhase
  monument?: boolean
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  indigo_plant: { type: 'indigo_plant', kind: 'production', cost: 1, vp: 1, count: 10, good: 'indigo' },
  sugar_mill: { type: 'sugar_mill', kind: 'production', cost: 2, vp: 1, count: 8, good: 'sugar' },
  tobacco_storage: { type: 'tobacco_storage', kind: 'production', cost: 3, vp: 2, count: 8, good: 'tobacco' },
  coffee_roaster: { type: 'coffee_roaster', kind: 'production', cost: 4, vp: 2, count: 8, good: 'coffee' },
  silver_smelter: { type: 'silver_smelter', kind: 'production', cost: 5, vp: 3, count: 8, good: 'silver' },

  smithy: { type: 'smithy', kind: 'violet', cost: 1, vp: 1, count: 3, phase: 'builder' },
  gold_mine: { type: 'gold_mine', kind: 'violet', cost: 1, vp: 1, count: 3, phase: 'prospector' },
  archive: { type: 'archive', kind: 'violet', cost: 1, vp: 1, count: 3, phase: 'councillor' },
  poor_house: { type: 'poor_house', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'builder' },
  black_market: { type: 'black_market', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'builder' },
  trading_post: { type: 'trading_post', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'trader' },
  well: { type: 'well', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'producer' },
  market_stand: { type: 'market_stand', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'trader' },
  crane: { type: 'crane', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'builder' },
  chapel: { type: 'chapel', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'governor' },
  tower: { type: 'tower', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'governor' },
  aqueduct: { type: 'aqueduct', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'producer' },
  carpenter: { type: 'carpenter', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'builder' },
  prefecture: { type: 'prefecture', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'councillor' },
  market_hall: { type: 'market_hall', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'trader' },
  quarry: { type: 'quarry', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'builder' },
  library: { type: 'library', kind: 'violet', cost: 5, vp: 3, count: 3, phase: 'all' },

  statue: { type: 'statue', kind: 'violet', cost: 3, vp: 3, count: 3, monument: true },
  victory_column: { type: 'victory_column', kind: 'violet', cost: 4, vp: 4, count: 3, monument: true },
  hero: { type: 'hero', kind: 'violet', cost: 5, vp: 5, count: 3, monument: true },

  guild_hall: { type: 'guild_hall', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end' },
  city_hall: { type: 'city_hall', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end' },
  triumphal_arch: { type: 'triumphal_arch', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end' },
  palace: { type: 'palace', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end' },
}

/** A card is identified by its index in `CARD_LIST` (0..109). */
export type CardId = number

/** Every physical card in the deck, in a fixed order; `CARD_LIST[id]` is its building type. */
export const CARD_LIST: readonly BuildingType[] = Object.values(BUILDINGS).flatMap((b) =>
  Array.from({ length: b.count }, () => b.type),
)

export const DECK_SIZE = CARD_LIST.length

/** Hidden cards are sent to other players as this placeholder (see `playerView`). */
export const HIDDEN_CARD: CardId = -1

export function cardType(id: CardId): BuildingType {
  return CARD_LIST[id]
}

export function cardDef(id: CardId): BuildingDef {
  return BUILDINGS[CARD_LIST[id]]
}

/**
 * Trading house tiles: price in cards for [indigo, sugar, tobacco, coffee, silver].
 * NOTE: values from the commonly cited first-edition tiles; verify against a
 * physical copy if in doubt.
 */
export const TRADE_TILES: readonly (readonly number[])[] = [
  [1, 1, 1, 2, 2],
  [1, 1, 2, 2, 2],
  [1, 1, 2, 2, 3],
  [1, 2, 2, 2, 3],
  [1, 2, 2, 3, 3],
]

export function goodPrice(tile: number, good: GoodType): number {
  return TRADE_TILES[tile][GOODS.indexOf(good)]
}

export type RoleId = 'builder' | 'producer' | 'trader' | 'councillor' | 'prospector'

export const ROLES: readonly RoleId[] = ['builder', 'producer', 'trader', 'councillor', 'prospector']

export const HAND_LIMIT = 7
export const TOWER_HAND_LIMIT = 12
export const STARTING_HAND = 4
export const BUILDINGS_TO_END = 12
