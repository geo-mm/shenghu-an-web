import type { Game, LongFormMove, MoveFn } from 'boardgame.io'
import { ActivePlayers } from 'boardgame.io/core'
import { HIDDEN_CARD, type CardId, type RoleId } from './cards'
import { chooseBotAction } from './ai'
import {
  actBuild,
  actChooseRole,
  actCouncil,
  actGovernor,
  actOfficeSwap,
  actPass,
  actProduce,
  actSell,
  advance,
  createInitialState,
  tableCtx,
  type BuildAction,
  type GameOptions,
} from './engine'
import { actSetProfile } from './players'
import type { PlayerID, SanJuanState } from './state'

/** The host always has seat 0; only the host may set up the room and drive the bots. */
export const HOST_SEAT = '0'
export const MAX_SEATS = 4

/**
 * All moves run only on the host (`client: false`): they draw from the hidden
 * deck, which clients never see.
 *
 * Invalid moves are ignored rather than returning INVALID_MOVE: boardgame.io
 * then broadcasts a state that still carries plugin functions, which the P2P
 * transport can't serialise. So each action first runs on a copy to check it.
 */
type MoveContext = Parameters<MoveFn<SanJuanState>>[0]
type Action = (args: MoveContext, player: PlayerID, ...a: never[]) => string | null

function rejected(args: MoveContext, check: (trial: MoveContext) => string | null): boolean {
  // The state is plain JSON; the trial keeps the order when shuffling, so it uses no randomness.
  const trial = { ...args, G: JSON.parse(JSON.stringify(args.G)), random: { ...args.random, Shuffle: <T,>(a: T[]) => [...a] } }
  const err = check(trial)
  if (err) console.warn(`Ignored move by player ${args.playerID}: ${err}`)
  return err !== null
}

/** Engine actions by move name. The engine sees only the seated players (tableCtx), not every seat of the match. */
const ACTIONS = {
  governorAction: ({ G }, p, chapelCard: CardId | null, discards: CardId[], bankCards: CardId[] = []) =>
    actGovernor(G, p, chapelCard, discards, bankCards),
  officeSwap: ({ G, random }, p, cards: CardId[]) => actOfficeSwap(G, random, p, cards),
  chooseRole: ({ G }, p, role: RoleId) => actChooseRole(G, tableCtx(G), p, role),
  build: ({ G, random }, p, action: BuildAction) => actBuild(G, tableCtx(G), random, p, action),
  produce: ({ G, random }, p, indexes: number[]) => actProduce(G, tableCtx(G), random, p, indexes),
  sell: ({ G, random }, p, indexes: number[]) => actSell(G, tableCtx(G), random, p, indexes),
  councilDiscard: ({ G }, p, discards: CardId[]) => actCouncil(G, p, discards),
  pass: ({ G }, p) => actPass(G, p),
} satisfies Record<string, (args: MoveContext, p: PlayerID, ...a: never[]) => string | null>

/** Runs action `act` for player `p` if it is valid, then lets the game flow on. */
function perform(args: MoveContext, p: PlayerID, act: Action, a: unknown[]) {
  const { G, random, events } = args
  if (!G.started || rejected(args, (trial) => act(trial, p, ...(a as never[])))) return
  act(args, p, ...(a as never[]))
  advance(G, tableCtx(G), random)
  if (G.step.kind === 'gameOver') events.endGame({ winners: G.winners, scores: G.scores })
  else events.endTurn()
}

const move = (act: Action): LongFormMove<SanJuanState> => ({
  client: false,
  move: ((args: MoveContext, ...a: unknown[]) => perform(args, args.playerID, act, a)) as MoveFn<SanJuanState>,
})

/** A move that isn't a game action: nothing advances and no turn ends. Ignored if `check` finds a problem. */
const setting = (apply: (args: MoveContext, ...a: never[]) => string | null): LongFormMove<SanJuanState> => ({
  client: false,
  move: ((args: MoveContext, ...a: never[]) => {
    if (!rejected(args, (trial) => apply(trial, ...a))) apply(args, ...a)
  }) as MoveFn<SanJuanState>,
})

const hide = (cards: CardId[]) => cards.map(() => HIDDEN_CARD)

/** Who sits where when the host starts: the people connected plus the bots. */
export interface Seating {
  humans: PlayerID[]
  bots: PlayerID[]
}

function seatingError(G: SanJuanState, ctx: MoveContext['ctx'], playerID: PlayerID, seating: Seating): string | null {
  if (playerID !== HOST_SEAT) return 'Only the host can start the game.'
  if (G.started) return 'The game has already started.'
  const seats = [...seating.humans, ...seating.bots]
  if (!seating.humans.includes(HOST_SEAT)) return 'The host must play.'
  if (seating.bots.includes(HOST_SEAT)) return 'The host seat cannot be a bot.'
  if (new Set(seats).size !== seats.length || seats.some((s) => !ctx.playOrder.includes(s))) return 'Invalid seats.'
  if (seats.length < 2 || seats.length > MAX_SEATS) return 'A game needs 2 to 4 players.'
  return null
}

/**
 * Builds the game definition. Options are baked into `setup` because the P2P
 * host creates the match without setupData; only the host's copy runs setup.
 * With `lobby`, the match starts as a waiting room (G.started = false) and the
 * host starts it with the players who are there (startGame).
 */
export function createSanJuanGame(options: GameOptions = {}): Game<SanJuanState> {
  return {
  // A unique name matters for P2P: it is part of the host's PeerJS ID.
  name: 'san-juan-p2p',
  minPlayers: 2,
  maxPlayers: MAX_SEATS,

  setup: ({ ctx, random }) => ({ ...createInitialState(ctx, random, options), started: !options.lobby }),

  // Whoever must decide next (G.actor) gets the turn.
  turn: {
    // Everyone may send moves at any time (colour/icon, the host's room set-up);
    // the engine still only accepts game actions from G.actor.
    activePlayers: ActivePlayers.ALL,
    order: {
      first: ({ G, ctx }) => ctx.playOrder.indexOf(G.actor),
      next: ({ G, ctx }) => ctx.playOrder.indexOf(G.actor),
    },
  },

  moves: {
    ...(Object.fromEntries(Object.entries(ACTIONS).map(([name, act]) => [name, move(act as Action)])) as Record<
      keyof typeof ACTIONS,
      LongFormMove<SanJuanState>
    >),

    setProfile: setting(({ G, playerID }, profile: unknown) => actSetProfile(G, playerID, profile)),

    /** Host, before the start: put a bot in an empty seat (or take it out). */
    setBot: setting(({ G, ctx, playerID }, seat: PlayerID, on: boolean) => {
      if (playerID !== HOST_SEAT) return 'Only the host can add bots.'
      if (G.started) return 'The game has already started.'
      if (seat === HOST_SEAT || !ctx.playOrder.includes(seat)) return 'Invalid seat.'
      G.bots = on ? [...new Set([...G.bots, seat])].sort() : G.bots.filter((b) => b !== seat)
      return null
    }),

    /** Host: deal a fresh game for the seated players and start it. */
    startGame: {
      client: false,
      move: (({ G, ctx, random, playerID, events }: MoveContext, seating: Seating) => {
        const err = seatingError(G, ctx, playerID, seating)
        if (err) {
          console.warn(`Ignored startGame: ${err}`)
          return
        }
        const seats = [...seating.humans, ...seating.bots].sort()
        const fresh = createInitialState({ numPlayers: seats.length, playOrder: seats }, random, options)
        Object.assign(G, fresh, { started: true, bots: [...seating.bots].sort(), profiles: G.profiles })
        events.endTurn()
      }) as MoveFn<SanJuanState>,
    },

    /** Host: let the computer play the acting seat if it is a bot. */
    botTurn: {
      client: false,
      move: ((args: MoveContext) => {
        const { G, playerID, random } = args
        if (playerID !== HOST_SEAT || !G.started || !G.bots.includes(G.actor)) return
        const choice = chooseBotAction(G, tableCtx(G), () => random.Number())
        if (choice) perform(args, G.actor, ACTIONS[choice.move as keyof typeof ACTIONS] as Action, choice.args)
      }) as MoveFn<SanJuanState>,
    },
  },

  /** Hide the deck, discard pile, goods and other players' hands, chapel and drawn cards. */
  playerView: ({ G, playerID }) => ({
    ...G,
    deck: hide(G.deck),
    discard: hide(G.discard),
    players: Object.fromEntries(
      Object.entries(G.players).map(([id, pl]) => [
        id,
        {
          hand: id === playerID ? pl.hand : hide(pl.hand),
          pending: id === playerID ? pl.pending : hide(pl.pending),
          chapel: id === playerID ? pl.chapel : hide(pl.chapel),
          bank: id === playerID ? pl.bank : hide(pl.bank),
          bankUsed: pl.bankUsed,
          harbor: hide(pl.harbor),
          buildings: pl.buildings.map((b) => ({ card: b.card, good: b.good === null ? null : HIDDEN_CARD })),
        },
      ]),
    ),
  }),
}
}

export const SanJuanGame = createSanJuanGame()
