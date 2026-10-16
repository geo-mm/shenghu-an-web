import type { ClientState, MatchPlayer } from '../hooks/useP2PMatch'

interface Props {
  state: ClientState
  playerID: string
  players: MatchPlayer[]
  onDraw: () => void
}

export function Board({ state, playerID, players, onDraw }: Props) {
  const { G, ctx, isActive } = state
  const myTurn = ctx.currentPlayer === playerID
  const opponentOnline = players.filter((p) => String(p.id) !== playerID).every((p) => p.isConnected)

  return (
    <section className="panel board" data-testid="board">
      <div className="board-header">
        <h2>San Juan</h2>
        <span className="muted">
          Turn {ctx.turn} · state #{state._stateID} · {plural(G.drawCount, 'card')} drawn
        </span>
      </div>

      <div className={`turn-banner ${myTurn ? 'mine' : ''}`} data-testid="turn-banner">
        {myTurn ? 'Your turn — draw a card!' : `Waiting for Player ${ctx.currentPlayer}…`}
      </div>

      <button className="primary" data-testid="draw-btn" onClick={onDraw} disabled={!isActive || !myTurn}>
        Draw Card
      </button>
      {!opponentOnline && <p className="warn">Opponent is offline — moves will sync when they reconnect.</p>}

      <div className="hands">
        {ctx.playOrder.map((id) => (
          <div key={id} className="hand" data-testid={`hand-${id}`}>
            <h3>
              Player {id} {id === playerID && <span className="tag">you</span>}
              <span className="muted"> · {plural(G.hands[id]?.length ?? 0, 'card')}</span>
            </h3>
            <ul className="cards">
              {(G.hands[id] ?? []).map((card, i) => (
                <li key={i} className="card">
                  {card}
                </li>
              ))}
              {(G.hands[id] ?? []).length === 0 && <li className="muted">No cards yet</li>}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
