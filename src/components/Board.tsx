import { useState, type ReactNode } from 'react'
import { GOODS, ROLES, ROLE_INFO, cardDef, goodPrice, type CardId, type RoleId } from '../game/cards'
import {
  buildCost,
  councilDiscardCount,
  governorDiscardCount,
  maxGoodsPayment,
  maxProduce,
  maxSell,
  owns,
  placementError,
} from '../game/engine'
import type { PlayerID, SanJuanState } from '../game/state'
import type { ClientState, MatchPlayer } from '../hooks/useP2PMatch'
import { CardView } from './CardView'

type Moves = Record<string, (...args: unknown[]) => void>

interface Props {
  state: ClientState
  playerID: PlayerID
  players: MatchPlayer[]
  moves: Moves
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function Board({ state, playerID, players, moves }: Props) {
  const { G, ctx } = state
  const opponents = ctx.playOrder.filter((p) => p !== playerID)
  const online = (p: PlayerID) => players.find((m) => String(m.id) === p)?.isConnected ?? false

  return (
    <section className="board" data-testid="board">
      <StatusBar G={G} playerID={playerID} />

      {G.step.kind === 'gameOver' && <ScoreTable G={G} playerID={playerID} />}

      <RolePanel G={G} playerID={playerID} onChoose={(r) => moves.chooseRole(r)} />

      <div className="opponents">
        {opponents.map((p) => (
          <div key={p} className="panel area" data-testid={`area-${p}`}>
            <h3>
              Player {p} {G.governor === p && <span className="tag">governor</span>}
              {!online(p) && <span className="warn"> · offline</span>}
            </h3>
            <p className="muted small">
              {plural(G.players[p].hand.length, 'card')} in hand
              {G.players[p].chapel.length > 0 && ` · ${G.players[p].chapel.length} under chapel`}
              {' · '}
              {plural(G.players[p].buildings.length, 'building')}
            </p>
            <div className="cards-row">
              {G.players[p].buildings.map((b, i) => (
                <CardView key={i} id={b.card} hasGood={b.good !== null} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Remount on every state change so selections reset after each move. */}
      <MyArea key={state._stateID} G={G} ctx={ctx} playerID={playerID} moves={moves} />

      <Log G={G} playerID={playerID} />
    </section>
  )
}

function who(p: PlayerID | undefined, me: PlayerID) {
  return p === undefined ? '' : p === me ? 'You' : `Player ${p}`
}

function StatusBar({ G, playerID }: { G: SanJuanState; playerID: PlayerID }) {
  const step = G.step
  let text: string
  if (step.kind === 'gameOver') text = 'Game over'
  else if (step.kind === 'governor') text = 'Governor phase: chapel and hand limit'
  else if (step.kind === 'chooseRole') text = `${who(G.actor, playerID)} ${G.actor === playerID ? 'choose' : 'chooses'} a role`
  else text = `${ROLE_INFO[step.role].name} phase (chosen by ${who(step.chooser, playerID)})`
  const myTurn = G.actor === playerID && step.kind !== 'gameOver'
  return (
    <div className={`panel status-bar ${myTurn ? 'mine' : ''}`} data-testid="turn-banner">
      <div>
        <strong>Round {G.round}</strong> · Governor: {who(G.governor, playerID)} · {text}
      </div>
      <div className="muted small">
        Deck {G.deck.length} · Discard {G.discard.length}
        {step.kind !== 'gameOver' && !myTurn && ` · Waiting for ${who(G.actor, playerID)}…`}
        {myTurn && ' · Your move!'}
      </div>
    </div>
  )
}

function RolePanel({ G, playerID, onChoose }: { G: SanJuanState; playerID: PlayerID; onChoose: (r: RoleId) => void }) {
  const canChoose = G.step.kind === 'chooseRole' && G.actor === playerID
  const active = G.step.kind === 'role' ? G.step.role : null
  return (
    <div className="roles">
      {ROLES.map((r) => {
        const taken = G.rolesTaken.includes(r)
        return (
          <button
            key={r}
            className={`role ${active === r ? 'active' : ''} ${taken ? 'taken' : ''}`}
            disabled={!canChoose || taken}
            onClick={() => onChoose(r)}
            data-testid={`role-${r}`}
            title={`${ROLE_INFO[r].action} Privilege: ${ROLE_INFO[r].privilege}`}
          >
            <strong>{ROLE_INFO[r].name}</strong> <span className="muted">{ROLE_INFO[r].nameZh}</span>
            <span className="small">{ROLE_INFO[r].privilege}</span>
          </button>
        )
      })}
    </div>
  )
}

interface MyAreaProps {
  G: SanJuanState
  ctx: ClientState['ctx']
  playerID: PlayerID
  moves: Moves
}

/** My buildings, hand and the controls for whatever I must decide now. */
function MyArea({ G, ctx, playerID, moves }: MyAreaProps) {
  const me = G.players[playerID]
  const step = G.step
  const myTurn = G.actor === playerID
  const mode = !myTurn || step.kind === 'gameOver' || step.kind === 'chooseRole' ? 'idle' : step.kind === 'governor' ? 'governor' : step.role

  const [handSel, setHandSel] = useState<CardId[]>([])
  const [bldSel, setBldSel] = useState<number[]>([])
  const [target, setTarget] = useState<CardId | null>(null)
  const [replace, setReplace] = useState<number | null>(null)
  const [tuck, setTuck] = useState<CardId | null>(null)
  const [pendSel, setPendSel] = useState<CardId[]>([])

  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x])

  // What clicking a hand card / building does in this mode.
  const archive = owns(me, 'archive')
  const handClickable = mode === 'builder' || mode === 'governor' || (mode === 'councillor' && archive)
  const onHandClick = (c: CardId) => {
    if (mode === 'builder') {
      if (target === null) setTarget(c)
      else if (target === c) {
        setTarget(null)
        setHandSel([])
      } else setHandSel(toggle(handSel, c))
    } else if (mode === 'governor') {
      if (c === tuck) setTuck(null)
      setHandSel(toggle(handSel, c))
    } else if (mode === 'councillor') setPendSel(toggle(pendSel, c))
  }
  const buildingClickable = (i: number) => {
    const b = me.buildings[i]
    if (mode === 'producer') return b.good === null && cardDef(b.card).kind === 'production'
    if (mode === 'trader') return b.good !== null
    if (mode === 'builder') return b.good !== null && maxGoodsPayment(me) > 0
    return false
  }

  let panel: ReactNode = null
  if (mode === 'governor') {
    const hasChapel = owns(me, 'chapel')
    const need = governorDiscardCount(me, tuck !== null)
    panel = (
      <>
        <p>
          {hasChapel && 'You may tuck one card under your chapel (1 VP at the end). '}
          {need > 0 ? `Select ${plural(need, 'card')} to discard down to your hand limit.` : 'No discards needed.'}
        </p>
        {hasChapel && (
          <label>
            Tuck under chapel:{' '}
            <select value={tuck ?? ''} onChange={(e) => setTuck(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">— none —</option>
              {me.hand.filter((c) => !handSel.includes(c)).map((c) => (
                <option key={c} value={c}>
                  {cardDef(c).name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="actions">
          <button className="primary" disabled={handSel.length !== need} onClick={() => moves.governorAction(tuck, handSel)}>
            Confirm
          </button>
        </div>
      </>
    )
  } else if (mode === 'builder') {
    const goods = bldSel
    const placeErr = target === null ? null : placementError(me, target, replace)
    const cost = target === null ? null : buildCost(G, ctx, playerID, target, replace)
    const paid = handSel.length + goods.length
    panel = (
      <>
        <p>
          {target === null
            ? 'Click a card in your hand to build it.'
            : `Building ${cardDef(target).name}: costs ${plural(cost!, 'card')}. Select payment cards (${paid}/${cost}).`}
          {maxGoodsPayment(me) > 0 && ' Black market: click buildings with goods to pay with them.'}
        </p>
        {owns(me, 'crane') && (
          <label>
            Crane — build over:{' '}
            <select value={replace ?? ''} onChange={(e) => setReplace(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">— nothing (new building) —</option>
              {me.buildings.map((b, i) => (
                <option key={i} value={i}>
                  {cardDef(b.card).name}
                </option>
              ))}
            </select>
          </label>
        )}
        {placeErr && <p className="error">{placeErr}</p>}
        <div className="actions">
          <button
            className="primary"
            data-testid="build-btn"
            disabled={target === null || !!placeErr || paid !== cost}
            onClick={() => moves.build({ card: target, payment: handSel, goods, replace })}
          >
            Build
          </button>
          <button onClick={() => moves.pass()}>Pass</button>
        </div>
      </>
    )
  } else if (mode === 'producer') {
    const max = maxProduce(G, ctx, playerID)
    panel = (
      <>
        <p>Select up to {plural(max, 'empty production building')} to produce on ({bldSel.length}/{max}).</p>
        <div className="actions">
          <button className="primary" disabled={bldSel.length === 0 || bldSel.length > max} onClick={() => moves.produce(bldSel)}>
            Produce
          </button>
          <button onClick={() => moves.pass()}>Pass</button>
        </div>
      </>
    )
  } else if (mode === 'trader') {
    const max = maxSell(G, ctx, playerID)
    const tile = G.tradeTile!
    panel = (
      <>
        <TradeTile tile={tile} />
        <p>Select up to {plural(max, 'good')} to sell ({bldSel.length}/{max}).</p>
        <div className="actions">
          <button className="primary" disabled={bldSel.length === 0 || bldSel.length > max} onClick={() => moves.sell(bldSel)}>
            Sell
          </button>
          <button onClick={() => moves.pass()}>Pass</button>
        </div>
      </>
    )
  } else if (mode === 'councillor') {
    const need = councilDiscardCount(me)
    panel = (
      <>
        <p>
          You drew {plural(me.pending.length, 'card')}. Select {plural(need, 'card')} to discard
          {archive ? ' (archive: from drawn cards or your hand)' : ''}.
        </p>
        <div className="cards-row">
          {me.pending.map((c) => (
            <CardView key={c} id={c} selected={pendSel.includes(c)} tag={pendSel.includes(c) ? 'discard' : undefined} onClick={() => setPendSel(toggle(pendSel, c))} />
          ))}
        </div>
        <div className="actions">
          <button className="primary" disabled={pendSel.length !== need} onClick={() => moves.councilDiscard(pendSel)}>
            Confirm
          </button>
        </div>
      </>
    )
  } else if (mode === 'prospector' && G.reveal) {
    panel = (
      <>
        <p>Gold mine: all four costs differ — take one card.</p>
        <div className="cards-row">
          {G.reveal.cards.map((c) => (
            <CardView key={c} id={c} onClick={() => moves.goldMinePick(c)} />
          ))}
        </div>
      </>
    )
  } else if (G.step.kind === 'role' && G.step.role === 'trader' && G.tradeTile !== null) {
    panel = <TradeTile tile={G.tradeTile} />
  } else if (G.reveal) {
    panel = (
      <>
        <p>Player {G.reveal.player}'s gold mine reveals:</p>
        <div className="cards-row">
          {G.reveal.cards.map((c) => (
            <CardView key={c} id={c} />
          ))}
        </div>
      </>
    )
  }

  const handTag = (c: CardId) => {
    if (mode === 'builder') return c === target ? 'build' : handSel.includes(c) ? 'pay' : undefined
    if (mode === 'governor') return handSel.includes(c) ? 'discard' : c === tuck ? 'chapel' : undefined
    if (mode === 'councillor') return pendSel.includes(c) ? 'discard' : undefined
  }

  return (
    <div className={`panel area mine-area ${G.actor === playerID ? 'my-turn' : ''}`} data-testid={`area-${playerID}`}>
      <h3>
        You (Player {playerID}) {G.governor === playerID && <span className="tag">governor</span>}
        {me.chapel.length > 0 && <span className="muted small"> · {me.chapel.length} under chapel</span>}
      </h3>
      {panel && <div className="action-panel">{panel}</div>}

      <h4>Buildings ({me.buildings.length}/12)</h4>
      <div className="cards-row">
        {me.buildings.map((b, i) => {
          const clickable = buildingClickable(i)
          return (
            <CardView
              key={i}
              id={b.card}
              hasGood={b.good !== null}
              selected={bldSel.includes(i)}
              tag={bldSel.includes(i) ? (mode === 'producer' ? 'produce' : mode === 'trader' ? 'sell' : 'pay') : undefined}
              onClick={clickable ? () => setBldSel(toggle(bldSel, i)) : undefined}
            />
          )
        })}
      </div>

      <h4>Hand ({me.hand.length})</h4>
      <div className="cards-row" data-testid="my-hand">
        {me.hand.map((c) => (
          <CardView
            key={c}
            id={c}
            selected={handSel.includes(c) || c === target || (mode === 'councillor' && pendSel.includes(c))}
            tag={handTag(c)}
            onClick={handClickable ? () => onHandClick(c) : undefined}
          />
        ))}
        {me.hand.length === 0 && <span className="muted">No cards</span>}
      </div>
    </div>
  )
}

function TradeTile({ tile }: { tile: number }) {
  return (
    <div className="trade-tile" title="Trading house tile">
      {GOODS.map((g) => (
        <span key={g} className={`price c-${g}`}>
          {g} {goodPrice(tile, g)}
        </span>
      ))}
    </div>
  )
}

function Log({ G, playerID }: { G: SanJuanState; playerID: PlayerID }) {
  const entries = G.log.slice(-40).reverse()
  return (
    <details className="panel log" open>
      <summary>Game log</summary>
      <ol reversed>
        {entries.map((e, i) => (
          <li key={i}>
            <span className="muted">R{e.round}</span> {e.player != null && <strong>{who(e.player, playerID)}</strong>} {e.text}
          </li>
        ))}
      </ol>
    </details>
  )
}

function ScoreTable({ G, playerID }: { G: SanJuanState; playerID: PlayerID }) {
  if (!G.scores) return null
  return (
    <div className="panel scores" data-testid="scores">
      <h2>{G.winners?.includes(playerID) ? '🏆 You win!' : `Winner: ${G.winners?.map((p) => who(p, playerID)).join(' & ')}`}</h2>
      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Buildings</th>
            <th>Chapel</th>
            <th>Bonus</th>
            <th>Palace</th>
            <th>Total</th>
            <th title="Cards in hand + goods">Tie-break</th>
          </tr>
        </thead>
        <tbody>
          {G.scores.map((s) => (
            <tr key={s.player} className={G.winners?.includes(s.player) ? 'winner' : ''}>
              <td>{who(s.player, playerID)}</td>
              <td>{s.buildings}</td>
              <td>{s.chapel}</td>
              <td>{s.bonus}</td>
              <td>{s.palace}</td>
              <td>
                <strong>{s.total}</strong>
              </td>
              <td>{s.tiebreak}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

