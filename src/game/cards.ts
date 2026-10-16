/**
 * San Juan card data (first edition base game, 110 cards).
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
  name: string
  /** Traditional Chinese name. */
  nameZh: string
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
  text: string
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  indigo_plant: { type: 'indigo_plant', name: 'Indigo plant', nameZh: '染料廠', kind: 'production', cost: 1, vp: 1, count: 10, good: 'indigo', text: 'Produces indigo.' },
  sugar_mill: { type: 'sugar_mill', name: 'Sugar mill', nameZh: '製糖廠', kind: 'production', cost: 2, vp: 1, count: 8, good: 'sugar', text: 'Produces sugar.' },
  tobacco_storage: { type: 'tobacco_storage', name: 'Tobacco storage', nameZh: '菸草廠', kind: 'production', cost: 3, vp: 2, count: 8, good: 'tobacco', text: 'Produces tobacco.' },
  coffee_roaster: { type: 'coffee_roaster', name: 'Coffee roaster', nameZh: '咖啡烘焙廠', kind: 'production', cost: 4, vp: 2, count: 8, good: 'coffee', text: 'Produces coffee.' },
  silver_smelter: { type: 'silver_smelter', name: 'Silver smelter', nameZh: '煉銀廠', kind: 'production', cost: 5, vp: 3, count: 8, good: 'silver', text: 'Produces silver.' },

  smithy: { type: 'smithy', name: 'Smithy', nameZh: '鐵匠鋪', kind: 'violet', cost: 1, vp: 1, count: 3, phase: 'builder', text: 'Builder: production buildings cost 1 card less.' },
  gold_mine: { type: 'gold_mine', name: 'Gold mine', nameZh: '金礦', kind: 'violet', cost: 1, vp: 1, count: 3, phase: 'prospector', text: 'Prospector: reveal 4 cards; if all have different costs, take 1 into your hand.' },
  archive: { type: 'archive', name: 'Archive', nameZh: '檔案館', kind: 'violet', cost: 1, vp: 1, count: 3, phase: 'councillor', text: 'Councillor: you may discard from your whole hand, not only the drawn cards.' },
  poor_house: { type: 'poor_house', name: 'Poor house', nameZh: '救濟院', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'builder', text: 'Builder: after building, if you have 0 or 1 cards in hand, draw 1 card.' },
  black_market: { type: 'black_market', name: 'Black market', nameZh: '黑市', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'builder', text: 'Builder: you may pay with up to 2 goods (1 card each).' },
  trading_post: { type: 'trading_post', name: 'Trading post', nameZh: '交易站', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'trader', text: 'Trader: you may sell 1 additional good.' },
  well: { type: 'well', name: 'Well', nameZh: '水井', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'producer', text: 'Producer: if you produce 2 or more goods, draw 1 card.' },
  market_stand: { type: 'market_stand', name: 'Market stand', nameZh: '攤販', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'trader', text: 'Trader: if you sell 2 or more goods, draw 1 card.' },
  crane: { type: 'crane', name: 'Crane', nameZh: '起重機', kind: 'violet', cost: 2, vp: 1, count: 3, phase: 'builder', text: 'Builder: you may build over one of your buildings, paying only the difference.' },
  chapel: { type: 'chapel', name: 'Chapel', nameZh: '禮拜堂', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'governor', text: 'Governor: you may tuck 1 hand card under the chapel; 1 VP each at game end.' },
  tower: { type: 'tower', name: 'Tower', nameZh: '塔樓', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'governor', text: 'Governor: your hand limit is 12 instead of 7.' },
  aqueduct: { type: 'aqueduct', name: 'Aqueduct', nameZh: '水道橋', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'producer', text: 'Producer: you may produce 1 additional good.' },
  carpenter: { type: 'carpenter', name: 'Carpenter', nameZh: '木工場', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'builder', text: 'Builder: after building a violet building, draw 1 card.' },
  prefecture: { type: 'prefecture', name: 'Prefecture', nameZh: '省政府', kind: 'violet', cost: 3, vp: 2, count: 3, phase: 'councillor', text: 'Councillor: keep 1 additional card.' },
  market_hall: { type: 'market_hall', name: 'Market hall', nameZh: '市場', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'trader', text: 'Trader: when you sell at least 1 good, draw 1 additional card.' },
  quarry: { type: 'quarry', name: 'Quarry', nameZh: '採石場', kind: 'violet', cost: 4, vp: 2, count: 3, phase: 'builder', text: 'Builder: violet buildings cost 1 card less.' },
  library: { type: 'library', name: 'Library', nameZh: '圖書館', kind: 'violet', cost: 5, vp: 3, count: 3, phase: 'all', text: 'Doubles the privilege of the role you choose. (2 players: the governor may use it only once per round.)' },

  statue: { type: 'statue', name: 'Statue', nameZh: '雕像', kind: 'violet', cost: 3, vp: 3, count: 3, monument: true, text: 'Monument.' },
  victory_column: { type: 'victory_column', name: 'Victory column', nameZh: '勝利紀念柱', kind: 'violet', cost: 4, vp: 4, count: 3, monument: true, text: 'Monument.' },
  hero: { type: 'hero', name: 'Hero', nameZh: '英雄像', kind: 'violet', cost: 5, vp: 5, count: 3, monument: true, text: 'Monument.' },

  guild_hall: { type: 'guild_hall', name: 'Guild hall', nameZh: '同業公會', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', text: 'Game end: 2 VP per production building.' },
  city_hall: { type: 'city_hall', name: 'City hall', nameZh: '市政廳', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', text: 'Game end: 1 VP per violet building (including this one).' },
  triumphal_arch: { type: 'triumphal_arch', name: 'Triumphal arch', nameZh: '凱旋門', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', text: 'Game end: 4 / 6 / 8 VP for 1 / 2 / 3 monuments.' },
  palace: { type: 'palace', name: 'Palace', nameZh: '宮殿', kind: 'violet', cost: 6, vp: 0, count: 2, phase: 'end', text: 'Game end: +1 VP per 4 VP you have (rounded down).' },
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

export const ROLE_INFO: Record<RoleId, { name: string; nameZh: string; action: string; privilege: string }> = {
  builder: { name: 'Builder', nameZh: '建築師', action: 'Everyone may build 1 building.', privilege: 'Pays 1 card less.' },
  producer: { name: 'Producer', nameZh: '生產者', action: 'Everyone may produce 1 good.', privilege: 'Produces 1 extra good.' },
  trader: { name: 'Trader', nameZh: '商人', action: 'Everyone may sell 1 good.', privilege: 'Sells 1 extra good.' },
  councillor: { name: 'Councillor', nameZh: '議員', action: 'Everyone draws 2 cards, keeps 1.', privilege: 'Draws 5 cards instead of 2.' },
  prospector: { name: 'Prospector', nameZh: '淘金者', action: 'No action for the others.', privilege: 'Draws 1 card.' },
}

export const HAND_LIMIT = 7
export const TOWER_HAND_LIMIT = 12
export const STARTING_HAND = 4
export const BUILDINGS_TO_END = 12
