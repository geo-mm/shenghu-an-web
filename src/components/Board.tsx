import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CUSTOMS_PRICE, GOODS, HIDDEN_CARD, ROLES, cardDef, goodPrice, type BuildingType, type CardId, type RoleId, type SoldGood } from '../game/cards'
import {
  buildCost,
  buildDiscounts,
  canUseBank,
  councilDiscardCount,
  needsOfficeSwap,
  governorDiscardCount,
  maxGoodsPayment,
  maxProduce,
  maxSell,
  owns,
  placementError,
} from '../game/engine'
import type { PlayerID, SanJuanState } from '../game/state'
import type { ClientState, MatchPlayer } from '../hooks/useP2PMatch'
import { roleArt } from '../art'
import { useI18n } from '../i18n/I18n'
import type { Messages } from '../i18n/messages'
import { CardInfoProvider } from './CardInfo'
import { CardView } from './CardView'

type Moves = Record<string, (...args: unknown[]) => void>

interface Props {
  state: ClientState
  playerID: PlayerID
  players: MatchPlayer[]
  moves: Moves
}

/** Translates a player ID relative to me ("You" / "Player 1"). */
function useWho(me: PlayerID) {
  const { t } = useI18n()
  return (p: PlayerID) => t.who(p, p === me)
}

/** Where the other players sit, in play order after me (like a mahjong table: the next player is on my right). */
const SEATS: Record<number, Seat[]> = { 1: ['top'], 2: ['right', 'left'], 3: ['right', 'top', 'left'] }
type Seat = 'top' | 'left' | 'right'

/**
 * The whole game on one screen, laid out like a card table: opponents around
 * the edge, roles and status in the middle, the action panel and log at the
 * side, and my buildings and hand along the bottom.
 */
export function Board({ state, playerID, players, moves }: Props) {
  const { G, ctx } = state
  const order = ctx.playOrder
  const me = order.indexOf(playerID)
  const others = [...order.slice(me + 1), ...order.slice(0, me)]
  const seats = SEATS[others.length] ?? []
  const online = (p: PlayerID) => players.find((m) => String(m.id) === p)?.isConnected ?? false
  // MyArea and RolePanel render their controls into the action box (portal), so selections live next to the cards.
  const [actionBox, setActionBox] = useState<HTMLDivElement | null>(null)

  return (
    <CardInfoProvider>
      <section className={`board table seats-${others.length}`} data-testid="board">
        {others.map((p, i) => (
          <OpponentSeat key={p} G={G} p={p} me={playerID} seat={seats[i]} online={online(p)} />
        ))}

        <div className="table-center">
          <StatusBar G={G} playerID={playerID} />
          {G.step.kind === 'gameOver' ? (
            <ScoreTable G={G} playerID={playerID} />
          ) : (
            // Keyed by state so a pending (unconfirmed) role choice resets after every move.
            <RolePanel key={`roles-${state._stateID}`} G={G} playerID={playerID} actionBox={actionBox} onChoose={(r) => moves.chooseRole(r)} />
          )}
        </div>

        <aside className="table-side">
          <div className="action-box" ref={setActionBox} />
          <Log G={G} playerID={playerID} />
        </aside>

        {/* Remount on every state change so selections reset after each move. */}
        <MyArea key={`mine-${state._stateID}`} G={G} ctx={ctx} playerID={playerID} moves={moves} actionBox={actionBox} />
      </section>
    </CardInfoProvider>
  )
}

/** A row of cards that overlap just enough to fit their container, like a hand of mahjong tiles. */
function Fan({ n, className = '', children, ...rest }: { n: number; className?: string; children: ReactNode; 'data-testid'?: string }) {
  return (
    <div className={`fan ${className}`} style={{ '--n': Math.max(n, 1) } as React.CSSProperties} {...rest}>
      {children}
    </div>
  )
}

function OpponentSeat({ G, p, me, seat, online }: { G: SanJuanState; p: PlayerID; me: PlayerID; seat: Seat; online: boolean }) {
  const { t } = useI18n()
  const who = useWho(me)
  const pl = G.players[p]
  const stored = storedText(t, pl)
  return (
    <div className={`seat seat-${seat} ${G.actor === p && G.step.kind !== 'gameOver' ? 'acting' : ''}`} data-testid={`area-${p}`}>
      <div className="seat-info">
        <strong>{who(p)}</strong>
        {G.governor === p && <span className="tag">{t.governorTag}</span>}
        {!online && <span className="warn small">{t.offline}</span>}
        <span className="seat-hand" title={t.inHand(pl.hand.length)}>
          <CardView id={HIDDEN_CARD} />
          <span>×{pl.hand.length}</span>
        </span>
        <span className="muted small">{t.buildingsCount(pl.buildings.length)}</span>
        {stored && <span className="muted small">{stored}</span>}
      </div>
      <Fan n={pl.buildings.length} className="seat-buildings">
        {pl.buildings.map((b, i) => (
          <CardView key={i} id={b.card} hasGood={b.good !== null} />
        ))}
      </Fan>
    </div>
  )
}

function storedText(t: Messages, pl: SanJuanState['players'][string]) {
  return t.stored(pl.chapel.length, pl.bank.length, pl.harbor.length)
}

function StatusBar({ G, playerID }: { G: SanJuanState; playerID: PlayerID }) {
  const { t } = useI18n()
  const who = useWho(playerID)
  const step = G.step
  let text: string
  if (step.kind === 'gameOver') text = t.stepGameOver
  else if (step.kind === 'governor') text = t.stepGovernor
  else if (step.kind === 'chooseRole') text = t.stepChooseRole(who(G.actor), G.actor === playerID)
  else text = t.stepRole(t.roles[step.role].name, who(step.chooser))
  const myTurn = G.actor === playerID && step.kind !== 'gameOver'
  return (
    <div className={`panel status-bar ${myTurn ? 'mine' : ''}`} data-testid="turn-banner">
      <div>
        <strong>{t.round(G.round)}</strong> · {t.governorIs(who(G.governor))} · {text}
      </div>
      <div className="muted small">
        {t.deckDiscard(G.deck.length, G.discard.length)}
        {step.kind !== 'gameOver' && !myTurn && ` · ${t.waitingFor(who(G.actor))}`}
        {myTurn && <span data-testid="your-move"> · {t.yourMove}</span>}
      </div>
    </div>
  )
}

interface RolePanelProps {
  G: SanJuanState
  playerID: PlayerID
  actionBox: HTMLElement | null
  onChoose: (r: RoleId) => void
}

function RolePanel({ G, playerID, actionBox, onChoose }: RolePanelProps) {
  const { t } = useI18n()
  const [picked, setPicked] = useState<RoleId | null>(null)
  const canChoose = G.step.kind === 'chooseRole' && G.actor === playerID
  const active = G.step.kind === 'role' ? G.step.role : null
  return (
    <div className="role-panel">
      <div className="roles">
        {ROLES.map((r) => {
          const taken = G.rolesTaken.includes(r)
          return (
            <button
              key={r}
              className={`role ${active === r ? 'active' : ''} ${picked === r ? 'picked' : ''} ${taken ? 'taken' : ''}`}
              disabled={!canChoose || taken}
              aria-pressed={picked === r}
              onClick={() => setPicked(picked === r ? null : r)}
              data-testid={`role-${r}`}
              title={t.roleSummary(t.roles[r].action, t.roles[r].privilege)}
            >
              {roleArt(r) && <img className="role-art" src={roleArt(r)} alt="" draggable={false} />}
              <strong>{t.roles[r].name}</strong>
              <span className="small role-privilege">{t.roles[r].privilege}</span>
            </button>
          )
        })}
      </div>
      {canChoose &&
        actionBox &&
        createPortal(
          <div className="role-confirm">
            {picked === null ? (
              <p className="muted">{t.chooseRolePrompt}</p>
            ) : (
              <>
                <p>
                  <strong>{t.roles[picked].name}</strong> — {t.roleSummary(t.roles[picked].action, t.roles[picked].privilege)}
                </p>
                <div className="actions">
                  <button className="primary" data-testid="confirm-role" onClick={() => onChoose(picked)}>
                    {t.confirmRole(t.roles[picked].name)}
                  </button>
                  <button onClick={() => setPicked(null)}>{t.cancel}</button>
                </div>
              </>
            )}
          </div>,
          actionBox,
        )}
    </div>
  )
}

interface MyAreaProps {
  G: SanJuanState
  ctx: ClientState['ctx']
  playerID: PlayerID
  moves: Moves
  actionBox: HTMLElement | null
}

/** My buildings and hand along the bottom, plus the controls for whatever I must decide now (in the action box). */
function MyArea({ G, ctx, playerID, moves, actionBox }: MyAreaProps) {
  const who = useWho(playerID)
  const { t } = useI18n()
  const cardName = (c: CardId) => t.cards[cardDef(c).type][0]
  const me = G.players[playerID]
  const step = G.step
  const myTurn = G.actor === playerID
  const mode =
    !myTurn || step.kind === 'gameOver' || step.kind === 'chooseRole'
      ? 'idle'
      : step.kind === 'governor'
        ? needsOfficeSwap(G, playerID)
          ? 'office'
          : 'governor'
        : step.role

  const [handSel, setHandSel] = useState<CardId[]>([])
  const [bldSel, setBldSel] = useState<number[]>([])
  const [target, setTarget] = useState<CardId | null>(null)
  const [replace, setReplace] = useState<number | null>(null)
  const [tuck, setTuck] = useState<CardId | null>(null)
  const [bankSel, setBankSel] = useState<CardId[]>([])
  const [assignTo, setAssignTo] = useState<'discard' | 'bank'>('discard')
  const [pendSel, setPendSel] = useState<CardId[]>([])

  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x])

  // What clicking a hand card / building does in this mode.
  const archive = owns(me, 'archive')
  const handClickable = mode === 'builder' || mode === 'governor' || mode === 'office' || (mode === 'councillor' && archive)
  const onHandClick = (c: CardId) => {
    if (mode === 'builder') {
      if (target === null) setTarget(c)
      else if (target === c) {
        setTarget(null)
        setHandSel([])
      } else setHandSel(toggle(handSel, c))
    } else if (mode === 'governor') {
      if (c === tuck) setTuck(null)
      // A card is either discarded or banked, never both.
      if (assignTo === 'bank') {
        setHandSel(handSel.filter((x) => x !== c))
        setBankSel(toggle(bankSel, c))
      } else {
        setBankSel(bankSel.filter((x) => x !== c))
        setHandSel(toggle(handSel, c))
      }
    } else if (mode === 'office') {
      if (handSel.includes(c) || handSel.length < 2) setHandSel(toggle(handSel, c))
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
  if (mode === 'office') {
    panel = (
      <>
        <p>{t.officePrompt(handSel.length)}</p>
        <div className="actions">
          <button className="primary" data-testid="office-swap" disabled={handSel.length === 0} onClick={() => moves.officeSwap(handSel)}>
            {t.officeSwap}
          </button>
          <button onClick={() => moves.officeSwap([])}>{t.skip}</button>
        </div>
      </>
    )
  } else if (mode === 'governor') {
    const hasChapel = owns(me, 'chapel')
    const hasBank = canUseBank(me)
    const need = governorDiscardCount(G, me, tuck !== null, bankSel.length)
    panel = (
      <>
        <p>
          {hasChapel && t.chapelPrompt}
          {hasBank && t.bankPrompt}
          {t.discardPrompt(need)}
        </p>
        {hasBank && (
          <div className="assign" role="radiogroup" aria-label={t.assignLabel}>
            <span>{t.assignLabel}</span>
            {(['discard', 'bank'] as const).map((a) => (
              <label key={a}>
                <input type="radio" name="assign" checked={assignTo === a} onChange={() => setAssignTo(a)} />{' '}
                {a === 'discard' ? t.assignDiscard : t.assignBank}
              </label>
            ))}
          </div>
        )}
        {hasChapel && (
          <label>
            {t.tuckLabel}{' '}
            <select value={tuck ?? ''} onChange={(e) => setTuck(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">{t.none}</option>
              {me.hand
                .filter((c) => !handSel.includes(c) && !bankSel.includes(c))
                .map((c) => (
                  <option key={c} value={c}>
                    {cardName(c)}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="actions">
          <button className="primary" disabled={handSel.length !== need} onClick={() => moves.governorAction(tuck, handSel, bankSel)}>
            {t.confirm}
          </button>
        </div>
      </>
    )
  } else if (mode === 'builder') {
    const goods = bldSel
    const placeErr = target === null ? null : placementError(me, target, replace)
    const cost = target === null ? 0 : buildCost(G, ctx, playerID, target, replace)
    const discounts = target === null ? [] : buildDiscounts(G, ctx, playerID, target, replace)
    const paid = handSel.length + goods.length
    panel = (
      <>
        <p>
          {target === null ? t.buildPick : t.buildPay(cardName(target), cost, paid)}
          {maxGoodsPayment(me) > 0 && t.blackMarketHint}
        </p>
        {target !== null && discounts.length > 0 && (
          <p className="muted small" data-testid="cost-breakdown">
            {t.costBreakdown(
              cardDef(target).cost,
              discounts.map((d) =>
                d.source === 'privilege'
                  ? t.discountPrivilege(d.amount)
                  : d.source === 'crane'
                    ? t.discountCrane(d.amount)
                    : t.discountBuilding(d.amount, t.cards[d.source][0]),
              ),
              cost,
            )}
          </p>
        )}
        {step.kind === 'role' && step.chooser !== playerID && <p className="muted small">{t.noPrivilege(who(step.chooser))}</p>}
        {owns(me, 'crane') && (
          <label>
            {t.craneLabel}{' '}
            <select value={replace ?? ''} onChange={(e) => setReplace(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">{t.craneNone}</option>
              {me.buildings.map((b, i) => (
                <option key={i} value={i}>
                  {cardName(b.card)}
                </option>
              ))}
            </select>
          </label>
        )}
        {placeErr && <p className="error">{t.placement[placeErr]}</p>}
        <div className="actions">
          <button
            className="primary"
            data-testid="build-btn"
            disabled={target === null || !!placeErr || paid !== cost}
            onClick={() => moves.build({ card: target, payment: handSel, goods, replace })}
          >
            {t.build}
          </button>
          <button onClick={() => moves.pass()}>{t.pass}</button>
        </div>
      </>
    )
  } else if (mode === 'producer') {
    const max = maxProduce(G, ctx, playerID)
    panel = (
      <>
        <p>{t.producePrompt(max, bldSel.length)}</p>
        <div className="actions">
          <button className="primary" disabled={bldSel.length === 0 || bldSel.length > max} onClick={() => moves.produce(bldSel)}>
            {t.produce}
          </button>
          <button onClick={() => moves.pass()}>{t.pass}</button>
        </div>
      </>
    )
  } else if (mode === 'trader') {
    const max = maxSell(G, ctx, playerID)
    panel = (
      <>
        <TradeTile tile={G.tradeTile!} t={t} customs={owns(me, 'customs_office')} />
        <p>{t.sellPrompt(max, bldSel.length)}</p>
        <div className="actions">
          <button className="primary" disabled={bldSel.length === 0 || bldSel.length > max} onClick={() => moves.sell(bldSel)}>
            {t.sell}
          </button>
          <button onClick={() => moves.pass()}>{t.pass}</button>
        </div>
      </>
    )
  } else if (mode === 'councillor') {
    const need = councilDiscardCount(me)
    panel = (
      <>
        <p>{t.councilPrompt(me.pending.length, need, archive)}</p>
        <Fan n={me.pending.length} className="pending">
          {me.pending.map((c) => (
            <CardView
              key={c}
              id={c}
              selected={pendSel.includes(c)}
              tag={pendSel.includes(c) ? t.tags.discard : undefined}
              onClick={() => setPendSel(toggle(pendSel, c))}
            />
          ))}
        </Fan>
        <div className="actions">
          <button className="primary" disabled={pendSel.length !== need} onClick={() => moves.councilDiscard(pendSel)}>
            {t.confirm}
          </button>
        </div>
      </>
    )
  } else if (G.step.kind !== 'gameOver' && !myTurn) {
    panel = (
      <>
        {G.step.kind === 'role' && G.step.role === 'trader' && G.tradeTile !== null && <TradeTile tile={G.tradeTile} t={t} />}
        <p className="muted">{t.waitingFor(who(G.actor))}</p>
        <p className="muted small">{t.cardHint}</p>
      </>
    )
  }

  const handTag = (c: CardId) => {
    if (mode === 'builder') return c === target ? t.tags.build : handSel.includes(c) ? t.tags.pay : undefined
    if (mode === 'governor')
      return handSel.includes(c) ? t.tags.discard : bankSel.includes(c) ? t.tags.bank : c === tuck ? t.tags.chapel : undefined
    if (mode === 'office') return handSel.includes(c) ? t.tags.swap : undefined
    if (mode === 'councillor') return pendSel.includes(c) ? t.tags.discard : undefined
  }
  const buildingTag = mode === 'producer' ? t.tags.produce : mode === 'trader' ? t.tags.sell : t.tags.pay

  return (
    <div className={`seat seat-me ${myTurn && step.kind !== 'gameOver' ? 'acting' : ''}`} data-testid={`area-${playerID}`}>
      {panel && actionBox && createPortal(<div className="action-panel">{panel}</div>, actionBox)}
      <div className="seat-info">
        <strong>{t.youPlayer(playerID)}</strong>
        {G.governor === playerID && <span className="tag">{t.governorTag}</span>}
        <span className="muted small">{t.buildingsTitle(me.buildings.length)}</span>
        {storedText(t, me) && <span className="muted small">{storedText(t, me)}</span>}
      </div>
      <Fan n={me.buildings.length} className="my-buildings" data-testid="my-buildings">
        {me.buildings.map((b, i) => (
          <CardView
            key={i}
            id={b.card}
            hasGood={b.good !== null}
            selected={bldSel.includes(i)}
            tag={bldSel.includes(i) ? buildingTag : undefined}
            onClick={buildingClickable(i) ? () => setBldSel(toggle(bldSel, i)) : undefined}
          />
        ))}
      </Fan>

      <Fan n={me.hand.length} className="hand" data-testid="my-hand">
        {me.hand.map((c) => (
          <CardView
            key={c}
            id={c}
            selected={handSel.includes(c) || bankSel.includes(c) || c === target || (mode === 'councillor' && pendSel.includes(c))}
            tag={handTag(c)}
            onClick={handClickable ? () => onHandClick(c) : undefined}
          />
        ))}
        {me.hand.length === 0 && <span className="muted">{t.noCards}</span>}
      </Fan>
    </div>
  )
}

function TradeTile({ tile, t, customs }: { tile: number; t: Messages; customs?: boolean }) {
  return (
    <div className="trade-tile" title={t.tradeTile}>
      {GOODS.map((g) => (
        <span key={g} className={`price c-${g}`}>
          {t.goods[g]} {goodPrice(tile, g)}
        </span>
      ))}
      {customs && <span className="price c-violet">{t.customsPrice(CUSTOMS_PRICE)}</span>}
    </div>
  )
}

function Log({ G, playerID }: { G: SanJuanState; playerID: PlayerID }) {
  const { t } = useI18n()
  const who = useWho(playerID)
  const helpers = {
    card: (b: BuildingType) => t.cards[b][0],
    good: (g: SoldGood) => t.goods[g],
    role: (r: RoleId) => t.roles[r].name,
    who,
  }
  const entries = G.log.slice(-40).reverse()
  return (
    <div className="panel log">
      <h3>{t.gameLog}</h3>
      <ol reversed>
        {entries.map((e, i) => (
          <li key={i}>
            <span className="muted">R{e.round}</span> {e.player != null && <strong>{who(e.player)}</strong>} {t.log(e, helpers)}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ScoreTable({ G, playerID }: { G: SanJuanState; playerID: PlayerID }) {
  const { t } = useI18n()
  const who = useWho(playerID)
  if (!G.scores) return null
  return (
    <div className="panel scores" data-testid="scores">
      <h2>{G.winners?.includes(playerID) ? t.youWin : t.winner((G.winners ?? []).map(who).join(' & '))}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {t.scoreCols.map((c, i) => (
                <th key={c} title={i === 6 ? t.tiebreakTitle : i === 2 ? t.storedTitle : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {G.scores.map((s) => (
              <tr key={s.player} className={G.winners?.includes(s.player) ? 'winner' : ''}>
                <td>{who(s.player)}</td>
                <td>{s.buildings}</td>
                <td>{s.stored}</td>
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
