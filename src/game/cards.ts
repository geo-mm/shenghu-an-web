/**
 * San Juan card data: second edition base game (110 cards) plus the optional
 * "New Buildings" expansion. Names and effect texts are in src/i18n/messages.ts.
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
  // "New Buildings" expansion (Office Building not implemented yet: its effect is unknown)
  | 'guard_room'
  | 'hut'
  | 'tavern'
  | 'bank'
  | 'customs_office'
  | 'park'
  | 'harbor'
  | 'goldsmith'
  | 'residence'
  | 'cathedral'

/** Phase in which a violet building's function applies. */
export type BuildingPhase = 'governor' | 'builder' | 'producer' | 'trader' | 'councillor' | 'prospector' | 'all' | 'end'

export interface BuildingDef {
  type: BuildingType
  kind: 'production' | 'violet'
  cost: number
  /** Printed victory points (the cost-6 buildings score through `bonus` instead). */
  vp: number
  /** Number of copies in the base game. */
  count: number
  /** Extra copies added by the "New Buildings" expansion. */
  expansion?: number
  /** Good produced (production buildings only). */
  good?: GoodType
  /** When a violet building's function applies. */
  phase?: BuildingPhase
  monument?: boolean
  /** Scores a variable bonus at game end instead of printed VP. */
  bonus?: boolean
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  indigo_plant: { type: 'indigo_plant', kind: 'production', cost: 1, vp: 1, count: 10, expansion: 1, good: 'indigo' },
  sugar_mill: { type: 'sugar_mill', kind: 'production', cost: 2, vp: 1, count: 8, good: 'sugar' },
  tobacco_storage: { type: 'tobacco_storage', kind: 'production', cost: 3, vp: 2, count: 8, expansion: 1, good: 'tobacco' },
  coffee_roaster: { type: 'coffee_roaster', kind: 'production', cost: 4, vp: 2, count: 8, expansion: 1, good: 'coffee' },
  silver_smelter: { type: 'silver_smelter', kind: 'production', cost: 5, vp: 3, count: 8, expansion: 1, good: 'silver' },

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
  prefecture: { type: 'prefecture', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'councillor' },
  market_hall: { type: 'market_hall', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'trader' },
  quarry: { type: 'quarry', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'builder' },
  library: { type: 'library', kind: 'violet', cost: 5, vp: 3, count: 3, phase: 'all' },

  statue: { type: 'statue', kind: 'violet', cost: 3, vp: 3, count: 3, monument: true },
  victory_column: { type: 'victory_column', kind: 'violet', cost: 4, vp: 4, count: 3, monument: true },
  hero: { type: 'hero', kind: 'violet', cost: 5, vp: 5, count: 3, monument: true },

  guild_hall: { type: 'guild_hall', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', bonus: true },
  city_hall: { type: 'city_hall', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', bonus: true },
  triumphal_arch: { type: 'triumphal_arch', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', bonus: true },
  palace: { type: 'palace', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', bonus: true },

  // "New Buildings" expansion
  guard_room: { type: 'guard_room', kind: 'violet', cost: 1, vp: 1, count: 0, expansion: 3, phase: 'governor' },
  hut: { type: 'hut', kind: 'violet', cost: 1, vp: 1, count: 0, expansion: 3, phase: 'trader' },
  tavern: { type: 'tavern', kind: 'violet', cost: 2, vp: 1, count: 0, expansion: 3, phase: 'builder' },
  bank: { type: 'bank', kind: 'violet', cost: 3, vp: 2, count: 0, expansion: 3, phase: 'governor' },
  customs_office: { type: 'customs_office', kind: 'violet', cost: 3, vp: 2, count: 0, expansion: 3, phase: 'councillor' },
  park: { type: 'park', kind: 'violet', cost: 3, vp: 2, count: 0, expansion: 3, phase: 'builder' },
  harbor: { type: 'harbor', kind: 'violet', cost: 4, vp: 2, count: 0, expansion: 3, phase: 'trader' },
  goldsmith: { type: 'goldsmith', kind: 'violet', cost: 5, vp: 3, count: 0, expansion: 3, phase: 'prospector' },
  residence: { type: 'residence', kind: 'violet', cost: 6, vp: 0, count: 0, expansion: 2, phase: 'end', bonus: true },
  cathedral: { type: 'cathedral', kind: 'violet', cost: 7, vp: 0, count: 0, expansion: 1, phase: 'end', bonus: true },
}

/** A card is identified by its index in `CARD_LIST`. */
export type CardId = number

const copies = (n: (b: BuildingDef) => number | undefined) =>
  Object.values(BUILDINGS).flatMap((b) => Array.from({ length: n(b) ?? 0 }, () => b.type))

/**
 * Every physical card, in a fixed order; `CARD_LIST[id]` is its building type.
 * Base-game cards come first (ids 0..109), then the expansion's cards.
 */
export const CARD_LIST: readonly BuildingType[] = [...copies((b) => b.count), ...copies((b) => b.expansion)]

export const BASE_DECK_SIZE = copies((b) => b.count).length

/** Card ids used in a game, with or without the "New Buildings" expansion. */
export function deckCards(expansion: boolean): CardId[] {
  return CARD_LIST.map((_, id) => id).filter((id) => expansion || id < BASE_DECK_SIZE)
}

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

/** A good on the customs office always sells for this many cards. */
export const CUSTOMS_PRICE = 2

/** What was sold: a production good, or the customs office's good. */
export type SoldGood = GoodType | 'customs'

export type RoleId = 'builder' | 'producer' | 'trader' | 'councillor' | 'prospector'

export const ROLES: readonly RoleId[] = ['builder', 'producer', 'trader', 'councillor', 'prospector']

export const HAND_LIMIT = 7
/** Hand limit for players without a guard room while someone owns one. */
export const GUARD_ROOM_HAND_LIMIT = 6
/** Crane building over a park: the new building costs this much less. */
export const PARK_DISCOUNT = 6
/** Residence / cathedral bonus for 1, 2, 3 and 4+ sets or buildings. */
export const SET_BONUS = [0, 4, 7, 9, 10]
export const TOWER_HAND_LIMIT = 12
export const STARTING_HAND = 4
export const BUILDINGS_TO_END = 12
