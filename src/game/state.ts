import type { BuildingType, CardId, GoodType, RoleId } from './cards'

export type PlayerID = string

export interface Building {
  card: CardId
  /** Face-down card lying on a production building as a good, if any. */
  good: CardId | null
}

export interface PlayerState {
  hand: CardId[]
  buildings: Building[]
  /** Cards tucked under the chapel (1 VP each at game end). */
  chapel: CardId[]
  /** Councillor: drawn cards waiting for the keep/discard decision. */
  pending: CardId[]
}

/**
 * Where the game is. The player who must act next is always `G.actor`
 * (mirrored into boardgame.io's `ctx.currentPlayer`).
 */
export type Step =
  /** Start of round: chapel tuck + hand limit, resolved player by player. */
  | { kind: 'governor'; queue: PlayerID[] }
  /** `G.pickers[0]` picks one of the remaining roles. */
  | { kind: 'chooseRole' }
  /** Every player in `queue` (chooser first) resolves `role`; `queue[0]` is acting. */
  | { kind: 'role'; role: RoleId; chooser: PlayerID; queue: PlayerID[] }
  | { kind: 'gameOver' }

export interface GoldMineReveal {
  player: PlayerID
  cards: CardId[]
}

/** Structured log entry, translated by the UI (see src/i18n). */
export type LogEvent =
  | { key: 'roundStart'; governor: PlayerID }
  | { key: 'cannotBuild' | 'noEmptyProduction' | 'noGoods' | 'chapelTuck' | 'pass' }
  | { key: 'poorHouseDraw' | 'carpenterDraw' | 'wellDraw' }
  | { key: 'councilKeptAll' | 'prospect' | 'handLimitDiscard' | 'councilKeep'; n: number }
  | { key: 'goldStrike' | 'goldMiss'; cards: BuildingType[] }
  | { key: 'goldTake'; card: BuildingType }
  | { key: 'chooseRole'; role: RoleId }
  | { key: 'build'; card: BuildingType; n: number; over?: BuildingType }
  | { key: 'produce'; goods: GoodType[] }
  | { key: 'sell'; goods: GoodType[]; n: number }
  | { key: 'gameOver'; winners: PlayerID[]; vp: number }

export type LogEntry = LogEvent & {
  round: number
  player?: PlayerID
}

export interface Score {
  player: PlayerID
  /** Printed VP of all buildings. */
  buildings: number
  chapel: number
  /** Guild hall, city hall and triumphal arch. */
  bonus: number
  palace: number
  total: number
  /** Tie-breaker: cards in hand + goods. */
  tiebreak: number
}

export interface SanJuanState {
  deck: CardId[]
  discard: CardId[]
  players: Record<PlayerID, PlayerState>
  round: number
  governor: PlayerID
  /** Players still to pick a role this round, in order. */
  pickers: PlayerID[]
  rolesTaken: RoleId[]
  step: Step
  actor: PlayerID
  /** Trading house tile stack (indexes into TRADE_TILES), top first. */
  tradeTiles: number[]
  /** Tile revealed for the current trader phase. */
  tradeTile: number | null
  reveal: GoldMineReveal | null
  /** 2-player rule: the governor may use the library only once per round. */
  governorUsedLibrary: boolean
  log: LogEntry[]
  scores: Score[] | null
  winners: PlayerID[] | null
}
