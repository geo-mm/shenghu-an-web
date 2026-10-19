import type { Game, LongFormMove, MoveFn } from 'boardgame.io'
import { ActivePlayers } from 'boardgame.io/core'
import { HIDDEN_CARD, type CardId, type RoleId } from './cards'
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
  type BuildAction,
  type GameOptions,
} from './engine'
import { actSetProfile } from './players'
import type { SanJuanState } from './state'

/**
 * Wraps an engine action as a boardgame.io move. All moves run only on the
 * host (`client: false`): they draw from the hidden deck, which clients never see.
 *
 * Invalid moves are ignored rather than returning INVALID_MOVE: boardgame.io
 * then broadcasts a state that still carries plugin functions, which the P2P
 * transport can't serialise. So each action first runs on a copy to check it.
 */
type MoveContext = Parameters<MoveFn<SanJuanState>>[0]

function rejected(args: MoveContext, check: (trial: MoveContext) => string | null): boolean {
  // The state is plain JSON; the trial keeps the order when shuffling, so it uses no randomness.
  const trial = { ...args, G: JSON.parse(JSON.stringify(args.G)), random: { ...args.random, Shuffle: <T,>(a: T[]) => [...a] } }
  const err = check(trial)
  if (err) console.warn(`Ignored move by player ${args.playerID}: ${err}`)
  return err !== null
}

function move<A extends unknown[]>(
  act: (args: MoveContext, player: string, ...a: A) => string | null,
): LongFormMove<SanJuanState> {
  return {
    client: false,
    move: ((args: MoveContext, ...a: A) => {
      const { G, ctx, playerID, random, events } = args
      if (rejected(args, (trial) => act(trial, playerID, ...a))) return
      act(args, playerID, ...a)
      advance(G, ctx, random)
      if (G.step.kind === 'gameOver') events.endGame({ winners: G.winners, scores: G.scores })
      else events.endTurn()
    }) as MoveFn<SanJuanState>,
  }
}

const hide = (cards: CardId[]) => cards.map(() => HIDDEN_CARD)

/**
 * Builds the game definition. Options are baked into `setup` because the P2P
 * host creates the match without setupData; only the host's copy runs setup.
 */
export function createSanJuanGame(options: GameOptions = {}): Game<SanJuanState> {
  return {
  // A unique name matters for P2P: it is part of the host's PeerJS ID.
  name: 'san-juan-p2p',
  minPlayers: 2,
  maxPlayers: 4,

  setup: ({ ctx, random }) => createInitialState(ctx, random, options),

  // Whoever must decide next (G.actor) gets the turn.
  turn: {
    // Everyone may send moves at any time (to change their colour/icon); the engine
    // still only accepts game actions from G.actor.
    activePlayers: ActivePlayers.ALL,
    order: {
      first: ({ G, ctx }) => ctx.playOrder.indexOf(G.actor),
      next: ({ G, ctx }) => ctx.playOrder.indexOf(G.actor),
    },
  },

  moves: {
    governorAction: move(({ G }, p, chapelCard: CardId | null, discards: CardId[], bankCards: CardId[] = []) =>
      actGovernor(G, p, chapelCard, discards, bankCards),
    ),
    officeSwap: move(({ G, random }, p, cards: CardId[]) => actOfficeSwap(G, random, p, cards)),
    chooseRole: move(({ G, ctx }, p, role: RoleId) => actChooseRole(G, ctx, p, role)),
    build: move(({ G, ctx, random }, p, action: BuildAction) => actBuild(G, ctx, random, p, action)),
    produce: move(({ G, ctx, random }, p, indexes: number[]) => actProduce(G, ctx, random, p, indexes)),
    sell: move(({ G, ctx, random }, p, indexes: number[]) => actSell(G, ctx, random, p, indexes)),
    councilDiscard: move(({ G }, p, discards: CardId[]) => actCouncil(G, p, discards)),
    pass: move(({ G }, p) => actPass(G, p)),
    // Not a game action: no turn ends and nothing advances.
    setProfile: {
      client: false,
      move: ((args: MoveContext, profile: unknown) => {
        if (!rejected(args, (trial) => actSetProfile(trial.G, args.playerID, profile))) actSetProfile(args.G, args.playerID, profile)
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
