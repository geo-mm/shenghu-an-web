import type { Game, LongFormMove, MoveFn } from 'boardgame.io'
import { INVALID_MOVE } from 'boardgame.io/core'
import { HIDDEN_CARD, type CardId, type RoleId } from './cards'
import {
  actBuild,
  actChooseRole,
  actCouncil,
  actGoldMine,
  actGovernor,
  actPass,
  actProduce,
  actSell,
  advance,
  createInitialState,
  type BuildAction,
} from './engine'
import type { SanJuanState } from './state'

/**
 * Wraps an engine action as a boardgame.io move. All moves run only on the
 * host (`client: false`): they draw from the hidden deck, which clients never see.
 */
type MoveContext = Parameters<MoveFn<SanJuanState>>[0]

function move<A extends unknown[]>(
  act: (args: MoveContext, player: string, ...a: A) => string | null,
): LongFormMove<SanJuanState> {
  return {
    client: false,
    move: ((args: MoveContext, ...a: A) => {
      const { G, ctx, playerID, random, events } = args
      const err = act(args, playerID, ...a)
      if (err) {
        console.warn(`Invalid move by player ${playerID}: ${err}`)
        return INVALID_MOVE
      }
      advance(G, ctx, random)
      if (G.step.kind === 'gameOver') events.endGame({ winners: G.winners, scores: G.scores })
      else events.endTurn()
    }) as MoveFn<SanJuanState>,
  }
}

const hide = (cards: CardId[]) => cards.map(() => HIDDEN_CARD)

export const SanJuanGame: Game<SanJuanState> = {
  // A unique name matters for P2P: it is part of the host's PeerJS ID.
  name: 'san-juan-p2p',
  minPlayers: 2,
  maxPlayers: 4,

  setup: ({ ctx, random }) => createInitialState(ctx, random),

  // Whoever must decide next (G.actor) gets the turn.
  turn: {
    order: {
      first: ({ G, ctx }) => ctx.playOrder.indexOf(G.actor),
      next: ({ G, ctx }) => ctx.playOrder.indexOf(G.actor),
    },
  },

  moves: {
    governorAction: move(({ G }, p, chapelCard: CardId | null, discards: CardId[]) =>
      actGovernor(G, p, chapelCard, discards),
    ),
    chooseRole: move(({ G, ctx }, p, role: RoleId) => actChooseRole(G, ctx, p, role)),
    build: move(({ G, ctx, random }, p, action: BuildAction) => actBuild(G, ctx, random, p, action)),
    produce: move(({ G, ctx, random }, p, indexes: number[]) => actProduce(G, ctx, random, p, indexes)),
    sell: move(({ G, ctx, random }, p, indexes: number[]) => actSell(G, ctx, random, p, indexes)),
    councilDiscard: move(({ G }, p, discards: CardId[]) => actCouncil(G, p, discards)),
    goldMinePick: move(({ G }, p, card: CardId) => actGoldMine(G, p, card)),
    pass: move(({ G }, p) => actPass(G, p)),
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
          buildings: pl.buildings.map((b) => ({ card: b.card, good: b.good === null ? null : HIDDEN_CARD })),
        },
      ]),
    ),
  }),
}
