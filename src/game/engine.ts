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
  CARD_LIST,
  HAND_LIMIT,
  ROLE_INFO,
  STARTING_HAND,
  TOWER_HAND_LIMIT,
  TRADE_TILES,
  cardDef,
  cardType,
  goodPrice,
  type BuildingType,
  type CardId,
  type RoleId,
} from './cards'
import type { PlayerID, PlayerState, SanJuanState, Score } from './state'

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

export function handLimit(player: PlayerState): number {
  return owns(player, 'tower') ? TOWER_HAND_LIMIT : HAND_LIMIT
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
  const player = G.players[p]
  const def = cardDef(card)
  let discount = privilege(G, ctx, p)
  if (def.kind === 'production' && owns(player, 'smithy')) discount += 1
  if (def.kind === 'violet' && owns(player, 'quarry')) discount += 1
  if (replace !== null) discount += cardDef(player.buildings[replace].card).cost
  return Math.max(0, def.cost - discount)
}

/** Why `p` may not place `card` (optionally replacing building `replace`), or null if it's allowed. */
export function placementError(player: PlayerState, card: CardId, replace: number | null): string | null {
  const def = cardDef(card)
  if (replace !== null) {
    if (!owns(player, 'crane')) return 'You need a crane to build over a building.'
    if (!player.buildings[replace]) return 'No such building to replace.'
  } else if (player.buildings.length >= BUILDINGS_TO_END) {
    return `You already have ${BUILDINGS_TO_END} buildings.`
  }
  if (def.kind === 'violet') {
    const dup = player.buildings.findIndex((b, i) => i !== replace && cardType(b.card) === def.type)
    if (dup !== -1) return `You already own a ${def.name}; violet buildings are unique.`
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

/** Cards `p` must discard in the governor phase, given whether they tuck one under the chapel. */
export function governorDiscardCount(player: PlayerState, tucking: boolean): number {
  return Math.max(0, player.hand.length - (tucking ? 1 : 0) - handLimit(player))
}

function needsGovernorDecision(player: PlayerState): boolean {
  return (owns(player, 'chapel') && player.hand.length > 0) || player.hand.length > handLimit(player)
}

// ---------------------------------------------------------------------------
// Card movement
// ---------------------------------------------------------------------------

function log(G: SanJuanState, text: string, player?: PlayerID) {
  // Omit `player` when absent: undefined would arrive as null after JSON transport.
  G.log.push(player === undefined ? { round: G.round, text } : { round: G.round, player, text })
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

export function createInitialState(ctx: EngineCtx, rng: Rng): SanJuanState {
  const deck = rng.Shuffle(CARD_LIST.map((_, id) => id))
  const players: Record<PlayerID, PlayerState> = {}
  for (const p of ctx.playOrder) {
    // Each player starts with an indigo plant in play…
    const indigo = deck.findIndex((id) => cardType(id) === 'indigo_plant')
    const [card] = deck.splice(indigo, 1)
    players[p] = { hand: [], buildings: [{ card, good: null }], chapel: [], pending: [] }
  }
  // …and 4 cards in hand.
  for (const p of ctx.playOrder) players[p].hand = deck.splice(deck.length - STARTING_HAND, STARTING_HAND)

  const governor = rng.Shuffle([...ctx.playOrder])[0]
  const G: SanJuanState = {
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
    reveal: null,
    governorUsedLibrary: false,
    log: [],
    scores: null,
    winners: null,
  }
  log(G, `Round 1 begins. Player ${governor} is governor.`)
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
      while (step.queue.length > 0 && !needsGovernorDecision(G.players[step.queue[0]])) step.queue.shift()
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
    finishRole(G, ctx)
  }
}

/** Automatic part of a player's turn in a role. Returns true if they must then decide something. */
function startRoleTurn(G: SanJuanState, ctx: EngineCtx, rng: Rng, p: PlayerID): boolean {
  const player = G.players[p]
  const { role, chooser } = currentRole(G)!
  switch (role) {
    case 'builder':
      if (canBuildAnything(G, ctx, p)) return true
      log(G, 'cannot build anything.', p)
      return false
    case 'producer':
      if (player.buildings.some((b) => b.good === null && cardDef(b.card).kind === 'production')) return true
      log(G, 'has no empty production building.', p)
      return false
    case 'trader':
      if (goodsCount(player) > 0) return true
      log(G, 'has no goods to sell.', p)
      return false
    case 'councillor': {
      const n = councilDraws(G, ctx, p)
      if (p === chooser) markLibraryUse(G, ctx, p, privilegeFactor(G, ctx, p))
      player.pending = drawCards(G, rng, n)
      if (councilDiscardCount(player) > 0) return true
      // Nothing to choose (deck ran dry): keep whatever was drawn.
      player.hand.push(...player.pending)
      log(G, `drew and kept ${plural(player.pending.length, 'card')}.`, p)
      player.pending = []
      return false
    }
    case 'prospector': {
      if (p === chooser) {
        const factor = privilegeFactor(G, ctx, p)
        markLibraryUse(G, ctx, p, factor)
        const n = drawToHand(G, rng, p, factor)
        log(G, `prospects and draws ${plural(n, 'card')}.`, p)
      }
      if (!owns(player, 'gold_mine')) return false
      const cards = drawCards(G, rng, 4)
      const costs = new Set(cards.map((c) => cardDef(c).cost))
      if (cards.length === 4 && costs.size === 4) {
        G.reveal = { player: p, cards }
        log(G, `strikes gold: ${cards.map((c) => cardDef(c).name).join(', ')}.`, p)
        return true
      }
      G.discard.push(...cards)
      log(G, `finds no gold (${cards.map((c) => cardDef(c).name).join(', ') || 'no cards'}).`, p)
      return false
    }
  }
}

function finishRole(G: SanJuanState, ctx: EngineCtx) {
  const { role } = currentRole(G)!
  if (role === 'trader' && G.tradeTile !== null) {
    // The used tile goes face down to the bottom of the stack.
    G.tradeTiles.push(G.tradeTiles.shift()!)
    G.tradeTile = null
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
  log(G, `Round ${G.round} begins. Player ${G.governor} is governor.`)
  G.step = { kind: 'governor', queue: orderFrom(ctx, G.governor) }
}

/** Removes the acting player from the role queue once their decision is done. */
function doneActing(G: SanJuanState) {
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

export function actGovernor(G: SanJuanState, p: PlayerID, chapelCard: CardId | null, discards: CardId[]): string | null {
  const err = checkTurn(G, p, 'governor')
  if (err) return err
  const player = G.players[p]
  if (chapelCard !== null) {
    if (!owns(player, 'chapel')) return 'You have no chapel.'
    if (!player.hand.includes(chapelCard)) return 'That card is not in your hand.'
    if (discards.includes(chapelCard)) return 'You cannot both tuck and discard the same card.'
  }
  const required = governorDiscardCount(player, chapelCard !== null)
  if (discards.length !== required) return `You must discard exactly ${plural(required, 'card')}.`
  const hand = [...player.hand]
  if (!takeCards(hand, discards)) return 'Discards must be distinct cards from your hand.'
  if (chapelCard !== null) {
    hand.splice(hand.indexOf(chapelCard), 1)
    player.chapel.push(chapelCard)
    log(G, 'tucks a card under the chapel.', p)
  }
  player.hand = hand
  G.discard.push(...discards)
  if (discards.length) log(G, `discards ${plural(discards.length, 'card')} down to the hand limit.`, p)
  doneActing(G)
  return null
}

export function actChooseRole(G: SanJuanState, ctx: EngineCtx, p: PlayerID, role: RoleId): string | null {
  const err = checkTurn(G, p, 'chooseRole')
  if (err) return err
  if (!ROLE_INFO[role]) return 'Unknown role.'
  if (G.rolesTaken.includes(role)) return 'That role was already chosen this round.'
  G.rolesTaken.push(role)
  G.pickers.shift()
  G.step = { kind: 'role', role, chooser: p, queue: orderFrom(ctx, p) }
  if (role === 'trader') G.tradeTile = G.tradeTiles[0]
  log(G, `chooses the ${ROLE_INFO[role].name}.`, p)
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
  if (placeErr) return placeErr
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
    log(G, `builds a ${def.name} over the ${cardDef(old.card).name} for ${plural(cost, 'card')}.`, p)
  } else {
    player.buildings.push({ card, good: null })
    log(G, `builds a ${def.name} for ${plural(cost, 'card')}.`, p)
  }

  if (hadPoorHouse && player.hand.length <= 1 && drawToHand(G, rng, p, 1)) log(G, 'draws 1 card (poor house).', p)
  if (hadCarpenter && def.kind === 'violet' && drawToHand(G, rng, p, 1)) log(G, 'draws 1 card (carpenter).', p)
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
  const names = indexes.slice(0, produced).map((i) => cardDef(player.buildings[i].card).good)
  log(G, `produces ${produced ? names.join(', ') : 'nothing (no cards left)'}.`, p)
  if (produced >= 2 && owns(player, 'well') && drawToHand(G, rng, p, 1)) log(G, 'draws 1 card (well).', p)
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
  const sold: string[] = []
  for (const i of indexes) {
    const b = player.buildings[i]
    const good = cardDef(b.card).good!
    income += goodPrice(G.tradeTile, good)
    sold.push(good)
    G.discard.push(b.good!)
    b.good = null
  }
  if (indexes.length >= 2 && owns(player, 'market_stand')) income += 1
  if (owns(player, 'market_hall')) income += 1
  const drawn = drawToHand(G, rng, p, income)
  log(G, `sells ${sold.join(', ')} for ${plural(drawn, 'card')}.`, p)
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
  log(G, `keeps ${plural(councilKeeps(player), 'card')} as councillor.`, p)
  doneActing(G)
  return null
}

export function actGoldMine(G: SanJuanState, p: PlayerID, card: CardId): string | null {
  const err = checkTurn(G, p, 'prospector')
  if (err) return err
  if (!G.reveal || G.reveal.player !== p) return 'You have no gold mine reveal.'
  if (!G.reveal.cards.includes(card)) return 'Choose one of the revealed cards.'
  G.players[p].hand.push(card)
  G.discard.push(...G.reveal.cards.filter((c) => c !== card))
  G.reveal = null
  log(G, `takes the ${cardDef(card).name} from the gold mine.`, p)
  doneActing(G)
  return null
}

/** Declines the optional builder / producer / trader action. */
export function actPass(G: SanJuanState, p: PlayerID): string | null {
  if (G.actor !== p) return 'It is not your turn.'
  const r = currentRole(G)
  if (!r || !['builder', 'producer', 'trader'].includes(r.role)) return 'You cannot pass now.'
  log(G, 'passes.', p)
  doneActing(G)
  return null
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function scorePlayer(player: PlayerState, p: PlayerID): Score {
  const defs = player.buildings.map((b) => cardDef(b.card))
  const buildings = defs.reduce((sum, d) => sum + d.vp, 0)
  const chapel = player.chapel.length
  const has = (t: BuildingType) => defs.some((d) => d.type === t)
  let bonus = 0
  if (has('guild_hall')) bonus += 2 * defs.filter((d) => d.kind === 'production').length
  if (has('city_hall')) bonus += defs.filter((d) => d.kind === 'violet').length
  if (has('triumphal_arch')) bonus += [0, 4, 6, 8][defs.filter((d) => d.monument).length]
  const subtotal = buildings + chapel + bonus
  const palace = has('palace') ? Math.floor(subtotal / 4) : 0
  return {
    player: p,
    buildings,
    chapel,
    bonus,
    palace,
    total: subtotal + palace,
    tiebreak: player.hand.length + goodsCount(player),
  }
}

function endGame(G: SanJuanState, ctx: EngineCtx) {
  const scores = ctx.playOrder.map((p) => scorePlayer(G.players[p], p))
  const best = Math.max(...scores.map((s) => s.total))
  const top = scores.filter((s) => s.total === best)
  const bestTie = Math.max(...top.map((s) => s.tiebreak))
  G.scores = scores
  G.winners = top.filter((s) => s.tiebreak === bestTie).map((s) => s.player)
  G.step = { kind: 'gameOver' }
  log(G, `Game over! Winner: Player ${G.winners.join(' & Player ')} with ${best} VP.`)
}

/** Total number of cards anywhere — always 110 (used by tests). */
export function countAllCards(G: SanJuanState): number {
  let n = G.deck.length + G.discard.length + (G.reveal?.cards.length ?? 0)
  for (const pl of Object.values(G.players)) {
    n += pl.hand.length + pl.chapel.length + pl.pending.length
    n += pl.buildings.reduce((s, b) => s + 1 + (b.good !== null ? 1 : 0), 0)
  }
  return n
}

