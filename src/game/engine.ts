/**
 * San Juan rules engine.
 *
 * Pure functions that read or mutate a `SanJuanState` (inside boardgame.io they
 * run on an Immer draft). Each `act*` function validates one player decision
 * and returns an error string if it is illegal, or applies it and returns null.
 * `advance` then resolves everything automatic until the next decision.
 */
import {
  BUILDINGS_TO_END,
  CUSTOMS_PRICE,
  GUARD_ROOM_HAND_LIMIT,
  HAND_LIMIT,
  PARK_DISCOUNT,
  SET_BONUS,
  ROLES,
  STARTING_HAND,
  TOWER_HAND_LIMIT,
  TRADE_TILES,
  cardDef,
  cardType,
  deckCards,
  goodPrice,
  type BuildingType,
  type CardId,
  type RoleId,
  type SoldGood,
} from './cards'
import type { LogEvent, PlayerID, PlayerState, SanJuanState, Score } from './state'

export interface Rng {
  Shuffle<T>(deck: T[]): T[]
}

/** The subset of boardgame.io's ctx the engine needs. */
export interface EngineCtx {
  numPlayers: number
  playOrder: PlayerID[]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function owns(player: PlayerState, type: BuildingType): boolean {
  return player.buildings.some((b) => cardType(b.card) === type)
}

/** Players in seating order starting with `start`. */
export function orderFrom(ctx: EngineCtx, start: PlayerID): PlayerID[] {
  const i = ctx.playOrder.indexOf(start)
  return [...ctx.playOrder.slice(i), ...ctx.playOrder.slice(0, i)]
}

export function nextPlayer(ctx: EngineCtx, p: PlayerID): PlayerID {
  return orderFrom(ctx, p)[1 % ctx.numPlayers]
}

/** Tower: 12. Otherwise 7, or 6 for players without a guard room while anyone owns one. */
export function handLimit(G: SanJuanState, player: PlayerState): number {
  if (owns(player, 'tower')) return TOWER_HAND_LIMIT
  const guardRoomInPlay = Object.values(G.players).some((pl) => owns(pl, 'guard_room'))
  return guardRoomInPlay && !owns(player, 'guard_room') ? GUARD_ROOM_HAND_LIMIT : HAND_LIMIT
}

export function goodsCount(player: PlayerState): number {
  return player.buildings.filter((b) => b.good !== null).length
}

/** The role currently being resolved, and whether `p` chose it. */
function currentRole(G: SanJuanState): { role: RoleId; chooser: PlayerID } | null {
  return G.step.kind === 'role' ? { role: G.step.role, chooser: G.step.chooser } : null
}

/** 1 normally, 2 with a library (2 players: the governor's library works once per round). */
export function privilegeFactor(G: SanJuanState, ctx: EngineCtx, p: PlayerID): number {
  if (!owns(G.players[p], 'library')) return 1
  if (ctx.numPlayers === 2 && p === G.governor && G.governorUsedLibrary) return 1
  return 2
}

/** Privilege multiplier for `p` in the current role (0 if `p` didn't choose it). */
function privilege(G: SanJuanState, ctx: EngineCtx, p: PlayerID): number {
  const r = currentRole(G)
  return r && r.chooser === p ? privilegeFactor(G, ctx, p) : 0
}

function markLibraryUse(G: SanJuanState, ctx: EngineCtx, p: PlayerID, factor: number) {
  if (factor === 2 && ctx.numPlayers === 2 && p === G.governor) G.governorUsedLibrary = true
}

/**
 * Cards `p` must pay to build `card`, optionally over building `replace` (crane).
 * Builder privilege, smithy, quarry and crane are applied; never below 0.
 */
export function buildCost(G: SanJuanState, ctx: EngineCtx, p: PlayerID, card: CardId, replace: number | null = null): number {
  const discount = buildDiscounts(G, ctx, p, card, replace).reduce((sum, d) => sum + d.amount, 0)
  return Math.max(0, cardDef(card).cost - discount)
}

/** Where a build discount comes from: the builder privilege, a building, or the building replaced by the crane. */
export type DiscountSource = 'privilege' | 'smithy' | 'quarry' | 'crane'

/** Each discount that applies when `p` builds `card` (see buildCost), for showing how the cost adds up. */
export function buildDiscounts(G: SanJuanState, ctx: EngineCtx, p: PlayerID, card: CardId, replace: number | null = null) {
  const player = G.players[p]
  const def = cardDef(card)
  const discounts: { source: DiscountSource; amount: number }[] = []
  const priv = privilege(G, ctx, p)
  if (priv > 0) discounts.push({ source: 'privilege', amount: priv })
  if (def.kind === 'production' && owns(player, 'smithy')) discounts.push({ source: 'smithy', amount: 1 })
  if (def.kind === 'violet' && owns(player, 'quarry')) discounts.push({ source: 'quarry', amount: 1 })
  if (replace !== null) {
    const old = cardDef(player.buildings[replace].card)
    discounts.push({ source: 'crane', amount: old.type === 'park' ? PARK_DISCOUNT : old.cost })
  }
  return discounts
}

export type PlacementError = 'needCrane' | 'noSuchBuilding' | 'maxBuildings' | 'violetUnique'

const PLACEMENT_MESSAGES: Record<PlacementError, string> = {
  needCrane: 'You need a crane to build over a building.',
  noSuchBuilding: 'No such building to replace.',
  maxBuildings: `You already have ${BUILDINGS_TO_END} buildings.`,
  violetUnique: 'You already own this violet building; violet buildings are unique.',
}

/** Why `p` may not place `card` (optionally replacing building `replace`), or null if it's allowed. */
export function placementError(player: PlayerState, card: CardId, replace: number | null): PlacementError | null {
  const def = cardDef(card)
  if (replace !== null) {
    if (!owns(player, 'crane')) return 'needCrane'
    if (!player.buildings[replace]) return 'noSuchBuilding'
  } else if (player.buildings.length >= BUILDINGS_TO_END) {
    return 'maxBuildings'
  }
  if (def.kind === 'violet') {
    const dup = player.buildings.findIndex((b, i) => i !== replace && cardType(b.card) === def.type)
    if (dup !== -1) return 'violetUnique'
  }
  return null
}

export function maxGoodsPayment(player: PlayerState): number {
  return owns(player, 'black_market') ? Math.min(2, goodsCount(player)) : 0
}

/** Whether `p` can afford and place at least one card from hand (otherwise the builder turn is skipped). */
export function canBuildAnything(G: SanJuanState, ctx: EngineCtx, p: PlayerID): boolean {
  const player = G.players[p]
  const funds = player.hand.length - 1 + maxGoodsPayment(player)
  const replaceOptions: (number | null)[] = [null]
  if (owns(player, 'crane')) player.buildings.forEach((_, i) => replaceOptions.push(i))
  return player.hand.some((card) =>
    replaceOptions.some(
      (r) => placementError(player, card, r) === null && buildCost(G, ctx, p, card, r) <= funds,
    ),
  )
}

export function maxProduce(G: SanJuanState, ctx: EngineCtx, p: PlayerID): number {
  return 1 + privilege(G, ctx, p) + (owns(G.players[p], 'aqueduct') ? 1 : 0)
}

export function maxSell(G: SanJuanState, ctx: EngineCtx, p: PlayerID): number {
  return 1 + privilege(G, ctx, p) + (owns(G.players[p], 'trading_post') ? 1 : 0)
}

export function councilDraws(G: SanJuanState, ctx: EngineCtx, p: PlayerID): number {
  const priv = privilege(G, ctx, p)
  return priv === 0 ? 2 : priv === 1 ? 5 : 8
}

export function councilKeeps(player: PlayerState): number {
  return owns(player, 'prefecture') ? 2 : 1
}

/** How many cards `p` must discard to finish the councillor action. */
export function councilDiscardCount(player: PlayerState): number {
  return Math.max(0, player.pending.length - councilKeeps(player))
}

export function canUseBank(player: PlayerState): boolean {
  return owns(player, 'bank') && !player.bankUsed
}

/** Cards `p` must discard in the governor phase after tucking (chapel) and depositing (bank) some. */
export function governorDiscardCount(G: SanJuanState, player: PlayerState, tucking: boolean, banking = 0): number {
  return Math.max(0, player.hand.length - (tucking ? 1 : 0) - banking - handLimit(G, player))
}

/** Office building: may swap 1–2 hand cards at the start of the round (before the hand limit). */
export function needsOfficeSwap(G: SanJuanState, p: PlayerID): boolean {
  const step = G.step
  return step.kind === 'governor' && step.queue[0] === p && !step.officeDone &&
    owns(G.players[p], 'office_building') && G.players[p].hand.length > 0
}

function needsGovernorDecision(G: SanJuanState, player: PlayerState): boolean {
  const optional = (owns(player, 'chapel') || canUseBank(player)) && player.hand.length > 0
  return optional || player.hand.length > handLimit(G, player)
}

/** Price of the good on building `b` with the current trading house tile. */
export function sellPrice(G: SanJuanState, cardOnBuilding: CardId): number {
  const def = cardDef(cardOnBuilding)
  return def.type === 'customs_office' ? CUSTOMS_PRICE : goodPrice(G.tradeTile!, def.good!)
}

// ---------------------------------------------------------------------------
// Card movement
// ---------------------------------------------------------------------------

function log(G: SanJuanState, event: LogEvent, player?: PlayerID) {
  // Omit `player` when absent: undefined would arrive as null after JSON transport.
  G.log.push(player === undefined ? { ...event, round: G.round } : { ...event, round: G.round, player })
  if (G.log.length > 200) G.log.splice(0, G.log.length - 200)
}

/** Draws one card, reshuffling the discard pile into the deck if needed. Returns null if none are left. */
function drawOne(G: SanJuanState, rng: Rng): CardId | null {
  if (G.deck.length === 0 && G.discard.length > 0) {
    G.deck = rng.Shuffle(G.discard)
    G.discard = []
  }
  return G.deck.pop() ?? null
}

function drawCards(G: SanJuanState, rng: Rng, n: number): CardId[] {
  const out: CardId[] = []
  for (let i = 0; i < n; i++) {
    const c = drawOne(G, rng)
    if (c === null) break
    out.push(c)
  }
  return out
}

function drawToHand(G: SanJuanState, rng: Rng, p: PlayerID, n: number): number {
  const cards = drawCards(G, rng, n)
  G.players[p].hand.push(...cards)
  return cards.length
}

/** Removes `cards` from `from`; returns false (and changes nothing) unless all are present and distinct. */
function takeCards(from: CardId[], cards: CardId[]): boolean {
  if (new Set(cards).size !== cards.length) return false
  if (!cards.every((c) => from.includes(c))) return false
  for (const c of cards) from.splice(from.indexOf(c), 1)
  return true
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export interface GameOptions {
  /** Add the "New Buildings" expansion cards. */
  expansion?: boolean
}

export function createInitialState(ctx: EngineCtx, rng: Rng, options: GameOptions = {}): SanJuanState {
  const expansion = options.expansion ?? false
  const deck = rng.Shuffle(deckCards(expansion))
  const players: Record<PlayerID, PlayerState> = {}
  for (const p of ctx.playOrder) {
    // Each player starts with an indigo plant in play…
    const indigo = deck.findIndex((id) => cardType(id) === 'indigo_plant')
    const [card] = deck.splice(indigo, 1)
    players[p] = { hand: [], buildings: [{ card, good: null }], chapel: [], bank: [], bankUsed: false, harbor: [], pending: [] }
  }
  // …and 4 cards in hand.
  for (const p of ctx.playOrder) players[p].hand = deck.splice(deck.length - STARTING_HAND, STARTING_HAND)

  const governor = rng.Shuffle([...ctx.playOrder])[0]
  const G: SanJuanState = {
    expansion,
    soldThisPhase: 0,
    deck,
    discard: [],
    players,
    round: 1,
    governor,
    pickers: pickOrder(ctx, governor),
    rolesTaken: [],
    // No governor phase in round 1: nobody can be over the limit or own a chapel.
    step: { kind: 'chooseRole' },
    actor: governor,
    tradeTiles: rng.Shuffle(TRADE_TILES.map((_, i) => i)),
    tradeTile: null,
    governorUsedLibrary: false,
    log: [],
    scores: null,
    winners: null,
  }
  log(G, { key: 'roundStart', governor })
  return G
}

/** Role pick order for a round: each player once; with 2 players the governor picks again last. */
function pickOrder(ctx: EngineCtx, governor: PlayerID): PlayerID[] {
  const order = orderFrom(ctx, governor)
  return ctx.numPlayers === 2 ? [...order, governor] : order
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * Resolves automatic steps (skipped players, draws, end of role/round/game)
 * until a player has a decision to make, and sets `G.actor` to that player.
 */
export function advance(G: SanJuanState, ctx: EngineCtx, rng: Rng): void {
  for (;;) {
    const step = G.step
    if (step.kind === 'gameOver') return

    if (step.kind === 'governor') {
      while (step.queue.length > 0) {
        const p = step.queue[0]
        if (needsOfficeSwap(G, p) || needsGovernorDecision(G, G.players[p])) break
        step.queue.shift()
        step.officeDone = false
      }
      if (step.queue.length > 0) {
        G.actor = step.queue[0]
        return
      }
      G.step = { kind: 'chooseRole' }
      continue
    }

    if (step.kind === 'chooseRole') {
      G.actor = G.pickers[0]
      return
    }

    // Role step
    while (step.queue.length > 0) {
      if (startRoleTurn(G, ctx, rng, step.queue[0])) {
        G.actor = step.queue[0]
        return
      }
      step.queue.shift()
    }
    finishRole(G, ctx, rng)
  }
}

/** Automatic part of a player's turn in a role. Returns true if they must then decide something. */
function startRoleTurn(G: SanJuanState, ctx: EngineCtx, rng: Rng, p: PlayerID): boolean {
  const player = G.players[p]
  const { role, chooser } = currentRole(G)!
  switch (role) {
    case 'builder':
      if (canBuildAnything(G, ctx, p)) return true
      log(G, { key: 'cannotBuild' }, p)
      return false
    case 'producer':
      if (player.buildings.some((b) => b.good === null && cardDef(b.card).kind === 'production')) return true
      log(G, { key: 'noEmptyProduction' }, p)
      return false
    case 'trader':
      if (goodsCount(player) > 0) return true
      log(G, { key: 'noGoods' }, p)
      return false
    case 'councillor': {
      // Customs office: put a good on it (if it's empty) before drawing.
      const customs = player.buildings.find((b) => cardType(b.card) === 'customs_office')
      if (customs && customs.good === null) {
        customs.good = drawOne(G, rng)
        if (customs.good !== null) log(G, { key: 'customsGood' }, p)
      }
      const n = councilDraws(G, ctx, p)
      if (p === chooser) markLibraryUse(G, ctx, p, privilegeFactor(G, ctx, p))
      player.pending = drawCards(G, rng, n)
      if (councilDiscardCount(player) > 0) return true
      // Nothing to choose (deck ran dry): keep whatever was drawn.
      player.hand.push(...player.pending)
      log(G, { key: 'councilKeptAll', n: player.pending.length }, p)
      player.pending = []
      return false
    }
    case 'prospector': {
      if (p === chooser) {
        const factor = privilegeFactor(G, ctx, p)
        markLibraryUse(G, ctx, p, factor)
        const n = drawToHand(G, rng, p, factor)
        log(G, { key: 'prospect', n }, p)
      }
      if (owns(player, 'goldsmith')) {
        // Keep the card only if nobody has built that building yet.
        const card = drawOne(G, rng)
        if (card !== null) {
          const built = Object.values(G.players).some((pl) => owns(pl, cardType(card)))
          if (built) G.discard.push(card)
          else player.hand.push(card)
          log(G, { key: built ? 'goldsmithMiss' : 'goldsmithKeep', card: cardType(card) }, p)
        }
      }
      if (!owns(player, 'gold_mine')) return false
      // Gold mine: if the 4 cards all have different costs, the cheapest one is kept.
      const cards = drawCards(G, rng, 4)
      const costs = new Set(cards.map((c) => cardDef(c).cost))
      if (cards.length === 4 && costs.size === 4) {
        const kept = cards.reduce((a, b) => (cardDef(b).cost < cardDef(a).cost ? b : a))
        player.hand.push(kept)
        G.discard.push(...cards.filter((c) => c !== kept))
        log(G, { key: 'goldStrike', cards: cards.map(cardType), card: cardType(kept) }, p)
      } else {
        G.discard.push(...cards)
        log(G, { key: 'goldMiss', cards: cards.map(cardType) }, p)
      }
      return false
    }
  }
}

function finishRole(G: SanJuanState, ctx: EngineCtx, rng: Rng) {
  const { role, chooser } = currentRole(G)!
  if (role === 'trader') {
    // Hut: draw a card if nobody sold anything this phase.
    if (G.soldThisPhase === 0) {
      for (const p of orderFrom(ctx, chooser))
        if (owns(G.players[p], 'hut') && drawToHand(G, rng, p, 1)) log(G, { key: 'hutDraw' }, p)
    }
    if (G.tradeTile !== null) {
      // The used tile goes face down to the bottom of the stack.
      G.tradeTiles.push(G.tradeTiles.shift()!)
      G.tradeTile = null
    }
  }
  if (role === 'builder') {
    // Tavern: draw a card if nobody has fewer buildings than you.
    const fewest = Math.min(...Object.values(G.players).map((pl) => pl.buildings.length))
    for (const p of orderFrom(ctx, chooser)) {
      const pl = G.players[p]
      if (owns(pl, 'tavern') && pl.buildings.length === fewest && drawToHand(G, rng, p, 1)) log(G, { key: 'tavernDraw' }, p)
    }
  }
  if (role === 'builder' && Object.values(G.players).some((pl) => pl.buildings.length >= BUILDINGS_TO_END)) {
    endGame(G, ctx)
    return
  }
  if (G.pickers.length > 0) {
    G.step = { kind: 'chooseRole' }
    return
  }
  // New round: the governor passes to the left.
  G.round += 1
  G.governor = nextPlayer(ctx, G.governor)
  G.pickers = pickOrder(ctx, G.governor)
  G.rolesTaken = []
  G.governorUsedLibrary = false
  log(G, { key: 'roundStart', governor: G.governor })
  G.step = { kind: 'governor', queue: orderFrom(ctx, G.governor) }
}

/** Removes the acting player from the role queue once their decision is done. */
function doneActing(G: SanJuanState) {
  if (G.step.kind === 'governor') G.step.officeDone = false
  if (G.step.kind === 'role' || G.step.kind === 'governor') G.step.queue.shift()
}

// ---------------------------------------------------------------------------
// Player decisions
// ---------------------------------------------------------------------------

function checkTurn(G: SanJuanState, p: PlayerID, kind: 'governor' | 'chooseRole' | RoleId): string | null {
  if (G.actor !== p) return 'It is not your turn.'
  if (kind === 'governor' || kind === 'chooseRole') return G.step.kind === kind ? null : `Not in the ${kind} step.`
  if (G.step.kind !== 'role' || G.step.role !== kind) return `The ${kind} role is not being resolved.`
  return null
}

/** Office building: discard 0–2 hand cards and draw as many (0 = skip). */
export function actOfficeSwap(G: SanJuanState, rng: Rng, p: PlayerID, cards: CardId[]): string | null {
  const err = checkTurn(G, p, 'governor')
  if (err) return err
  if (!needsOfficeSwap(G, p)) return 'You have no office building swap now.'
  if (cards.length > 2) return 'You may swap at most 2 cards.'
  const player = G.players[p]
  const hand = [...player.hand]
  if (!takeCards(hand, cards)) return 'Choose distinct cards from your hand.'
  player.hand = hand
  G.discard.push(...cards)
  if (cards.length > 0) {
    drawToHand(G, rng, p, cards.length)
    log(G, { key: 'officeSwap', n: cards.length }, p)
  }
  ;(G.step as { officeDone?: boolean }).officeDone = true
  return null
}

export function actGovernor(
  G: SanJuanState,
  p: PlayerID,
  chapelCard: CardId | null,
  discards: CardId[],
  bankCards: CardId[] = [],
): string | null {
  const err = checkTurn(G, p, 'governor')
  if (err) return err
  if (needsOfficeSwap(G, p)) return 'Resolve the office building first.'
  const player = G.players[p]
  if (chapelCard !== null && !owns(player, 'chapel')) return 'You have no chapel.'
  if (bankCards.length > 0 && !canUseBank(player)) return 'You have no unused bank.'
  const required = governorDiscardCount(G, player, chapelCard !== null, bankCards.length)
  if (discards.length !== required) return `You must discard exactly ${plural(required, 'card')}.`
  const hand = [...player.hand]
  const chapelList = chapelCard === null ? [] : [chapelCard]
  if (!takeCards(hand, [...chapelList, ...bankCards, ...discards])) return 'Choose distinct cards from your hand.'
  if (chapelCard !== null) {
    player.chapel.push(chapelCard)
    log(G, { key: 'chapelTuck' }, p)
  }
  if (bankCards.length > 0) {
    player.bank.push(...bankCards)
    player.bankUsed = true
    log(G, { key: 'bankDeposit', n: bankCards.length }, p)
  }
  player.hand = hand
  G.discard.push(...discards)
  if (discards.length) log(G, { key: 'handLimitDiscard', n: discards.length }, p)
  doneActing(G)
  return null
}

export function actChooseRole(G: SanJuanState, ctx: EngineCtx, p: PlayerID, role: RoleId): string | null {
  const err = checkTurn(G, p, 'chooseRole')
  if (err) return err
  if (!ROLES.includes(role)) return 'Unknown role.'
  if (G.rolesTaken.includes(role)) return 'That role was already chosen this round.'
  G.rolesTaken.push(role)
  G.pickers.shift()
  G.step = { kind: 'role', role, chooser: p, queue: orderFrom(ctx, p) }
  if (role === 'trader') {
    G.tradeTile = G.tradeTiles[0]
    G.soldThisPhase = 0
  }
  log(G, { key: 'chooseRole', role }, p)
  return null
}

export interface BuildAction {
  card: CardId
  /** Hand cards discarded as payment. */
  payment: CardId[]
  /** Black market: indexes of own buildings whose goods are spent (1 card each). */
  goods?: number[]
  /** Crane: index of the own building to build over. */
  replace?: number | null
}

export function actBuild(G: SanJuanState, ctx: EngineCtx, rng: Rng, p: PlayerID, action: BuildAction): string | null {
  const err = checkTurn(G, p, 'builder')
  if (err) return err
  const player = G.players[p]
  const { card, payment } = action
  const goods = action.goods ?? []
  const replace = action.replace ?? null

  if (!player.hand.includes(card)) return 'That card is not in your hand.'
  if (payment.includes(card)) return 'You cannot pay with the card you are building.'
  const placeErr = placementError(player, card, replace)
  if (placeErr) return PLACEMENT_MESSAGES[placeErr]
  if (goods.length > 0) {
    if (!owns(player, 'black_market')) return 'You need a black market to pay with goods.'
    if (goods.length > 2) return 'The black market accepts at most 2 goods.'
    if (new Set(goods).size !== goods.length || goods.some((i) => player.buildings[i]?.good == null))
      return 'Choose distinct buildings that hold goods.'
  }
  const cost = buildCost(G, ctx, p, card, replace)
  if (payment.length + goods.length !== cost) return `This costs ${plural(cost, 'card')}.`
  const hand = [...player.hand]
  if (!takeCards(hand, [card, ...payment])) return 'Payment must be distinct cards from your hand.'

  // Effects come from buildings already in play before this build.
  const hadPoorHouse = owns(player, 'poor_house')
  const hadCarpenter = owns(player, 'carpenter')
  const r = currentRole(G)!
  if (r.chooser === p) markLibraryUse(G, ctx, p, privilegeFactor(G, ctx, p))

  player.hand = hand
  G.discard.push(...payment)
  for (const i of goods) {
    G.discard.push(player.buildings[i].good!)
    player.buildings[i].good = null
  }
  const def = cardDef(card)
  if (replace !== null) {
    const old = player.buildings[replace]
    G.discard.push(old.card)
    if (old.good !== null) G.discard.push(old.good)
    player.buildings[replace] = { card, good: null }
    log(G, { key: 'build', card: def.type, n: cost, over: cardType(old.card) }, p)
  } else {
    player.buildings.push({ card, good: null })
    log(G, { key: 'build', card: def.type, n: cost }, p)
  }

  if (hadPoorHouse && player.hand.length <= 1 && drawToHand(G, rng, p, 1)) log(G, { key: 'poorHouseDraw' }, p)
  if (hadCarpenter && def.kind === 'violet' && drawToHand(G, rng, p, 1)) log(G, { key: 'carpenterDraw' }, p)
  doneActing(G)
  return null
}

export function actProduce(G: SanJuanState, ctx: EngineCtx, rng: Rng, p: PlayerID, indexes: number[]): string | null {
  const err = checkTurn(G, p, 'producer')
  if (err) return err
  const player = G.players[p]
  if (indexes.length === 0) return 'Choose at least one building (or pass).'
  const max = maxProduce(G, ctx, p)
  if (indexes.length > max) return `You may produce at most ${plural(max, 'good')}.`
  if (new Set(indexes).size !== indexes.length) return 'Choose distinct buildings.'
  for (const i of indexes) {
    const b = player.buildings[i]
    if (!b || cardDef(b.card).kind !== 'production') return 'Only production buildings produce goods.'
    if (b.good !== null) return 'That building already holds a good.'
  }
  // The library only counts as used if the doubled privilege was actually needed.
  if (indexes.length > max - privilege(G, ctx, p) + 1) markLibraryUse(G, ctx, p, privilegeFactor(G, ctx, p))
  let produced = 0
  for (const i of indexes) {
    const good = drawOne(G, rng)
    if (good === null) break
    player.buildings[i].good = good
    produced++
  }
  const goods = indexes.slice(0, produced).map((i) => cardDef(player.buildings[i].card).good!)
  log(G, { key: 'produce', goods }, p)
  if (produced >= 2 && owns(player, 'well') && drawToHand(G, rng, p, 1)) log(G, { key: 'wellDraw' }, p)
  doneActing(G)
  return null
}

export function actSell(G: SanJuanState, ctx: EngineCtx, rng: Rng, p: PlayerID, indexes: number[]): string | null {
  const err = checkTurn(G, p, 'trader')
  if (err) return err
  const player = G.players[p]
  if (G.tradeTile === null) return 'No trading house tile is revealed.'
  if (indexes.length === 0) return 'Choose at least one good (or pass).'
  const max = maxSell(G, ctx, p)
  if (indexes.length > max) return `You may sell at most ${plural(max, 'good')}.`
  if (new Set(indexes).size !== indexes.length) return 'Choose distinct buildings.'
  if (indexes.some((i) => player.buildings[i]?.good == null)) return 'You can only sell goods you have.'
  if (indexes.length > max - privilege(G, ctx, p) + 1) markLibraryUse(G, ctx, p, privilegeFactor(G, ctx, p))

  let income = 0
  const sold: SoldGood[] = []
  const soldCards: CardId[] = []
  for (const i of indexes) {
    const b = player.buildings[i]
    const def = cardDef(b.card)
    income += sellPrice(G, b.card)
    sold.push(def.type === 'customs_office' ? 'customs' : def.good!)
    soldCards.push(b.good!)
    b.good = null
  }
  G.soldThisPhase += indexes.length
  // Harbor: one of the sold goods is kept under it as a VP.
  if (owns(player, 'harbor')) {
    player.harbor.push(soldCards.shift()!)
    log(G, { key: 'harborStore' }, p)
  }
  G.discard.push(...soldCards)
  if (indexes.length >= 2 && owns(player, 'market_stand')) income += 1
  if (owns(player, 'market_hall')) income += 1
  const drawn = drawToHand(G, rng, p, income)
  log(G, { key: 'sell', goods: sold, n: drawn }, p)
  doneActing(G)
  return null
}

/** Councillor: discard from the drawn cards (or, with an archive, from the whole hand). */
export function actCouncil(G: SanJuanState, p: PlayerID, discards: CardId[]): string | null {
  const err = checkTurn(G, p, 'councillor')
  if (err) return err
  const player = G.players[p]
  const required = councilDiscardCount(player)
  if (discards.length !== required) return `You must discard exactly ${plural(required, 'card')}.`
  const pool = owns(player, 'archive') ? [...player.hand, ...player.pending] : [...player.pending]
  if (!takeCards(pool, discards)) return 'Discards must be distinct cards you may discard.'
  player.hand = owns(player, 'archive') ? pool : [...player.hand, ...pool]
  player.pending = []
  G.discard.push(...discards)
  log(G, { key: 'councilKeep', n: councilKeeps(player) }, p)
  doneActing(G)
  return null
}

/** Declines the optional builder / producer / trader action. */
export function actPass(G: SanJuanState, p: PlayerID): string | null {
  if (G.actor !== p) return 'It is not your turn.'
  const r = currentRole(G)
  if (!r || !['builder', 'producer', 'trader'].includes(r.role)) return 'You cannot pass now.'
  log(G, { key: 'pass' }, p)
  doneActing(G)
  return null
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Residence: sets of 3 different buildings with the same cost (each building counts once). */
export function residenceSets(player: PlayerState): number {
  const typesByCost = new Map<number, Set<BuildingType>>()
  for (const b of player.buildings) {
    const d = cardDef(b.card)
    typesByCost.set(d.cost, (typesByCost.get(d.cost) ?? new Set()).add(d.type))
  }
  let sets = 0
  for (const types of typesByCost.values()) sets += Math.floor(types.size / 3)
  return sets
}

const setBonus = (n: number) => SET_BONUS[Math.min(n, SET_BONUS.length - 1)]

export function scorePlayer(G: SanJuanState, p: PlayerID): Score {
  const player = G.players[p]
  const defs = player.buildings.map((b) => cardDef(b.card))
  const buildings = defs.reduce((sum, d) => sum + d.vp, 0)
  const stored = player.chapel.length + player.bank.length + player.harbor.length
  const has = (t: BuildingType) => defs.some((d) => d.type === t)
  let bonus = 0
  if (has('guild_hall')) {
    // 1 VP per production building, plus 1 VP per different kind of production building.
    const production = defs.filter((d) => d.kind === 'production')
    bonus += production.length + new Set(production.map((d) => d.type)).size
  }
  if (has('city_hall')) bonus += defs.filter((d) => d.kind === 'violet').length
  if (has('triumphal_arch')) bonus += [0, 4, 6, 8][defs.filter((d) => d.monument).length]
  if (has('residence')) bonus += setBonus(residenceSets(player))
  if (has('cathedral')) {
    // Counts the cost-6 buildings owned by all opponents together.
    const opponentSixes = Object.entries(G.players)
      .filter(([id]) => id !== p)
      .flatMap(([, pl]) => pl.buildings)
      .filter((b) => cardDef(b.card).cost === 6).length
    bonus += setBonus(opponentSixes)
  }
  const subtotal = buildings + stored + bonus
  const palace = has('palace') ? Math.floor(subtotal / 4) : 0
  return {
    player: p,
    buildings,
    stored,
    bonus,
    palace,
    total: subtotal + palace,
    tiebreak: player.hand.length + goodsCount(player),
  }
}

function endGame(G: SanJuanState, ctx: EngineCtx) {
  const scores = ctx.playOrder.map((p) => scorePlayer(G, p))
  const best = Math.max(...scores.map((s) => s.total))
  const top = scores.filter((s) => s.total === best)
  const bestTie = Math.max(...top.map((s) => s.tiebreak))
  G.scores = scores
  G.winners = top.filter((s) => s.tiebreak === bestTie).map((s) => s.player)
  G.step = { kind: 'gameOver' }
  log(G, { key: 'gameOver', winners: G.winners, vp: best })
}

/** Total number of cards anywhere — constant for a game (used by tests). */
export function countAllCards(G: SanJuanState): number {
  let n = G.deck.length + G.discard.length
  for (const pl of Object.values(G.players)) {
    n += pl.hand.length + pl.chapel.length + pl.bank.length + pl.harbor.length + pl.pending.length
    n += pl.buildings.reduce((s, b) => s + 1 + (b.good !== null ? 1 : 0), 0)
  }
  return n
}

