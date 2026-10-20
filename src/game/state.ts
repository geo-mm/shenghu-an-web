import type { PlayerProfile } from './players'
import type { BuildingType, CardId, GoodType, RoleId, SoldGood } from './cards'

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
  /** Cards deposited in the bank (1 VP each); the bank can be used once per game. */
  bank: CardId[]
  bankUsed: boolean
  /** Sold goods kept under the harbor (1 VP each). */
  harbor: CardId[]
  /** Councillor: drawn cards waiting for the keep/discard decision. */
  pending: CardId[]
}

/**
 * Where the game is. The player who must act next is always `G.actor`
 * (mirrored into boardgame.io's `ctx.currentPlayer`).
 */
export type Step =
  /**
   * Start of round, resolved player by player: first the office building swap
   * (`officeDone` marks it finished for `queue[0]`), then chapel, bank and hand limit.
   */
  | { kind: 'governor'; queue: PlayerID[]; officeDone?: boolean }
  /** `G.pickers[0]` picks one of the remaining roles. */
  | { kind: 'chooseRole' }
  /** Every player in `queue` (chooser first) resolves `role`; `queue[0]` is acting. */
  | { kind: 'role'; role: RoleId; chooser: PlayerID; queue: PlayerID[] }
  | { kind: 'gameOver' }

/** Structured log entry, translated by the UI (see src/i18n). */
export type LogEvent =
  | { key: 'roundStart'; governor: PlayerID }
  | { key: 'cannotBuild' | 'noEmptyProduction' | 'noGoods' | 'chapelTuck' | 'pass' }
  | { key: 'poorHouseDraw' | 'carpenterDraw' | 'wellDraw' | 'tavernDraw' | 'hutDraw' | 'customsGood' | 'harborStore' }
  | { key: 'bankDeposit' | 'officeSwap'; n: number }
  | { key: 'goldsmithKeep' | 'goldsmithMiss'; card: BuildingType }
  | { key: 'councilKeptAll' | 'prospect' | 'handLimitDiscard' | 'councilKeep'; n: number }
  | { key: 'goldStrike'; cards: BuildingType[]; card: BuildingType }
  | { key: 'goldMiss'; cards: BuildingType[] }
  | { key: 'chooseRole'; role: RoleId }
  | { key: 'build'; card: BuildingType; n: number; over?: BuildingType }
  | { key: 'produce'; goods: GoodType[] }
  | { key: 'sell'; goods: SoldGood[]; n: number }
  | { key: 'gameOver'; winners: PlayerID[]; vp: number }

export type LogEntry = LogEvent & {
  round: number
  player?: PlayerID
}

export interface Score {
  player: PlayerID
  /** Printed VP of all buildings. */
  buildings: number
  /** Cards under the chapel, in the bank and under the harbor (1 VP each). */
  stored: number
  /** Guild hall, city hall, triumphal arch, residence and cathedral. */
  bonus: number
  palace: number
  total: number
  /** Tie-breaker: cards in hand + goods. */
  tiebreak: number
}

export interface SanJuanState {
  /** False while a hosted room is still waiting for players (see the lobby option). */
  started: boolean
  /** Players at the table, in seat order (a hosted room has 4 seats; only these play). */
  seats: PlayerID[]
  /** Seats played by the computer (the host's browser asks it to move). */
  bots: PlayerID[]
  /** Playing with the "New Buildings" expansion. */
  expansion: boolean
  /** Goods sold so far in the current trader phase (for the hut). */
  soldThisPhase: number
  deck: CardId[]
  discard: CardId[]
  players: Record<PlayerID, PlayerState>
  round: number
  governor: PlayerID
  /** Players still to pick a role this round, in order. */
  pickers: PlayerID[]
  rolesTaken: RoleId[]
  /** Colours and icons players picked (see players.ts for the defaults). */
  profiles: Record<PlayerID, PlayerProfile>
  /** Who chose each role taken this round. */
  roleChoosers: Partial<Record<RoleId, PlayerID>>
  step: Step
  actor: PlayerID
  /** Trading house tile stack (indexes into TRADE_TILES), top first. */
  tradeTiles: number[]
  /** Tile revealed for the current trader phase. */
  tradeTile: number | null
  /** 2-player rule: the governor may use the library only once per round. */
  governorUsedLibrary: boolean
  log: LogEntry[]
  scores: Score[] | null
  winners: PlayerID[] | null
}
