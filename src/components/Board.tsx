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
  tableCtx,
  type EngineCtx,
} from '../game/engine'
import type { PlayerID, SanJuanState } from '../game/state'
import type { ClientState, MatchPlayer } from '../hooks/useP2PMatch'
import { roleArt } from '../art'
import type { PlayerProfile } from '../game/players'
import { PlayerToken, PlayersProvider, ProfilePicker, saveProfilePref, usePlayerClass, usePlayerName, useProfiles } from './Players'
import { PhaseHints, useCombos, useHints, useRoleHint } from './Hints'
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
  /** Back to the lobby (offered when the game is over). */
  onLeave?: () => void
}

/** Translates a player ID relative to me ("You" / "Player 1"). */
function useWho(me: PlayerID) {
  const name = usePlayerName()
  return (p: PlayerID) => name(p, me)
}

/** Where the other players sit, in play order after me (like a mahjong table: the next player is on my right). */
const SEATS: Record<number, Seat[]> = { 1: ['top'], 2: ['right', 'left'], 3: ['right', 'top', 'left'] }
type Seat = 'top' | 'left' | 'right'

/**
 * The whole game on one screen, laid out like a card table: opponents around
 * the edge, roles and status in the middle, the action panel and log at the
 * side, and my buildings and hand along the bottom.
 */
export function Board({ state, playerID, players, moves, onLeave }: Props) {
  const { G } = state
  // Only the seated players: a hosted room has 4 seats but may start with fewer.
  const ctx = tableCtx(G)
  const order = G.seats
  const me = order.indexOf(playerID)
  const others = [...order.slice(me + 1), ...order.slice(0, me)]
  const seats = SEATS[others.length] ?? []
  const online = (p: PlayerID) => players.find((m) => String(m.id) === p)?.isConnected ?? false
  // MyArea and RolePanel render their controls into the action box (portal), so selections live next to the cards.
  const { t } = useI18n()
  const [hints] = useHints()
  const combos = useCombos()
  const [actionBox, setActionBox] = useState<HTMLDivElement | null>(null)
  const [sideBox, setSideBox] = useState<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [scoresCollapsed, setScoresCollapsed] = useState(false)
  const step = G.step
  const myDecision = G.actor === playerID && step.kind !== 'gameOver'
  const decisionTitle =
    step.kind === 'chooseRole' ? t.decisionChooseRole : step.kind === 'governor' ? t.stepGovernor : step.kind === 'role' ? t.decisionRole(t.roles[step.role].name) : ''
  const decisionArt = step.kind === 'role' ? roleArt(step.role) : step.kind === 'governor' ? roleArt('governor') : undefined
  const [profileOpen, setProfileOpen] = useState(false)
  const setProfile = (profile: PlayerProfile) => {
    saveProfilePref(profile)
    moves.setProfile(profile)
  }

  // Card details also list the card's combos with my buildings.
  const comboInfo = (id: CardId) => {
    const list = hints ? combos(G.players[playerID], cardDef(id).type) : []
    return list.length ? (
      <div className="combo-list" data-testid="combo-list">
        <strong>✦ {t.combosTitle}</strong>
        <ul>
          {list.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    ) : null
  }

  return (
    <CardInfoProvider extra={comboInfo}>
      <PlayersProvider G={G}>
        <section className={`board table seats-${others.length}`} data-testid="board">
          {others.map((p, i) => (
            <OpponentSeat key={p} G={G} p={p} me={playerID} seat={seats[i]} online={online(p)} />
          ))}

          <div className="table-center">
            <StatusBar G={G} playerID={playerID} />
            {/* Keyed by state so a pending (unconfirmed) role choice resets after every move. */}
            <RolePanel key={`roles-${state._stateID}`} G={G} playerID={playerID} actionBox={actionBox} onChoose={(r) => moves.chooseRole(r)} />
          </div>

          <aside className="table-side">
            <div className="side-note" ref={setSideBox} />
            <Log G={G} playerID={playerID} />
          </aside>

          {/* The final scores, in a window that can be folded away to look at the finished table. */}
          {step.kind === 'gameOver' && (
            <div className={`decision-window gameover-window ${scoresCollapsed ? 'collapsed' : ''}`} role="dialog" aria-label={t.stepGameOver} data-testid="gameover-window">
              <header className="decision-head">
                <span className="decision-art trophy" aria-hidden>
                  🏆
                </span>
                <h2>{t.stepGameOver}</h2>
                <button className="ghost decision-toggle" onClick={() => setScoresCollapsed(!scoresCollapsed)} aria-expanded={!scoresCollapsed}>
                  {scoresCollapsed ? t.expand : t.collapse}
                </button>
              </header>
              <div className="decision-body">
                <ScoreTable G={G} playerID={playerID} />
                {onLeave && (
                  <div className="actions">
                    <button className="primary" onClick={onLeave} data-testid="back-to-lobby">
                      {t.backToLobby}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My decisions open in a window over the middle of the table; my seat below stays usable. */}
          {myDecision && (
            <div className={`decision-window ${collapsed ? 'collapsed' : ''}`} role="dialog" aria-label={decisionTitle} data-testid="decision-window">
              <header className="decision-head">
                {decisionArt && <img className="decision-art" src={decisionArt} alt="" draggable={false} />}
                <h2>{decisionTitle}</h2>
                <button className="ghost decision-toggle" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} data-testid="decision-toggle">
                  {collapsed ? t.expand : t.collapse}
                </button>
              </header>
              <div className="decision-body" ref={setActionBox} />
            </div>
          )}

          {/* Remount on every state change so selections reset after each move. */}
          <MyArea
            key={`mine-${state._stateID}`}
            G={G}
            ctx={ctx}
            playerID={playerID}
            moves={moves}
            actionBox={actionBox}
            sideBox={sideBox}
            profileOpen={profileOpen}
            setProfileOpen={setProfileOpen}
            onProfile={setProfile}
          />
        </section>
      </PlayersProvider>
    </CardInfoProvider>
  )
}

function PlayerName({ p, me }: { p: PlayerID; me: PlayerID }) {
  const who = useWho(me)
  const pc = usePlayerClass()
  return (
    <span className={`pname ${pc(p)}`}>
      <PlayerToken p={p} />
      {who(p)}
    </span>
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
  const pc = usePlayerClass()
  const pl = G.players[p]
  const stored = storedText(t, pl)
  return (
    <div className={`seat seat-${seat} ${pc(p)} ${G.actor === p && G.step.kind !== 'gameOver' ? 'acting' : ''}`} data-testid={`area-${p}`}>
      <div className="seat-info">
        <PlayerName p={p} me={me} />
        {G.governor === p && <span className="tag">{t.governorTag}</span>}
        {G.bots.includes(p) && <span className="tag bot-tag">AI · {t.botLevels[G.botLevels[p] ?? 'player']}</span>}
        {!online && !G.bots.includes(p) && <span className="warn small">{t.offline}</span>}
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
  const [hints] = useHints()
  const roleHint = useRoleHint()
  const who = useWho(playerID)
  const pc = usePlayerClass()
  const [picked, setPicked] = useState<RoleId | null>(null)
  const canChoose = G.step.kind === 'chooseRole' && G.actor === playerID
  const active = G.step.kind === 'role' ? G.step.role : null
  const tiles = (
    <div className="roles">
      {ROLES.map((r) => {
        const taken = G.rolesTaken.includes(r)
        const chooser = G.roleChoosers?.[r]
        const hint = hints && !taken && G.players[playerID] ? roleHint(G, tableCtx(G), playerID, r) : null
        return (
          <button
            key={r}
            className={`role ${active === r ? 'active' : ''} ${picked === r ? 'picked' : ''} ${taken ? 'taken' : ''} ${chooser != null ? `chosen ${pc(chooser)}` : ''}`}
            disabled={!canChoose || taken}
            aria-pressed={picked === r}
            onClick={() => setPicked(picked === r ? null : r)}
            data-testid={`role-${r}`}
            title={[t.roleSummary(t.roles[r].action, t.roles[r].privilege), ...(hint?.details ?? [])].join('\n')}
          >
            {chooser != null && (
              <span className="role-chooser" data-testid={`role-chooser-${r}`}>
                <PlayerToken p={chooser} />
                {who(chooser)}
              </span>
            )}
            {roleArt(r) && <img className="role-art" src={roleArt(r)} alt="" draggable={false} />}
            <strong>{t.roles[r].name}</strong>
            {hint ? (
              <span className="small role-hint" data-testid={`role-hint-${r}`}>
                {hint.head}
              </span>
            ) : (
              <span className="small role-privilege">{t.roles[r].privilege}</span>
            )}
          </button>
        )
      })}
    </div>
  )
  // While I choose, the roles move into the decision window, next to the confirm button.
  return (
    <div className="role-panel">
      {!canChoose && tiles}
      {canChoose &&
        actionBox &&
        createPortal(
          <div className="role-confirm">
            {tiles}
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
  ctx: EngineCtx
  playerID: PlayerID
  moves: Moves
  actionBox: HTMLElement | null
  /** Where the "waiting for…" note goes when it isn't my turn. */
  sideBox: HTMLElement | null
  profileOpen: boolean
  setProfileOpen: (open: boolean) => void
  onProfile: (profile: PlayerProfile) => void
}

/** My buildings and hand along the bottom, plus the controls for whatever I must decide now (in the action box). */
function MyArea({ G, ctx, playerID, moves, actionBox, sideBox, profileOpen, setProfileOpen, onProfile }: MyAreaProps) {
  const who = useWho(playerID)
  const pc = usePlayerClass()
  const profiles = useProfiles()
  const [hints] = useHints()
  const combosOf = useCombos()
  const combos = (c: CardId) => (hints ? combosOf(me, cardDef(c).type) : undefined)
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
              combos={combos(c)}
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
    <div className={`seat seat-me ${pc(playerID)} ${myTurn && step.kind !== 'gameOver' ? 'acting' : ''}`} data-testid={`area-${playerID}`}>
      {panel &&
        (myTurn ? actionBox : sideBox) &&
        createPortal(
          <div className="action-panel">
            {panel}
            {hints && myTurn && step.kind === 'role' && (
              <PhaseHints G={G} ctx={ctx} p={playerID} role={step.role} asChooser={step.chooser === playerID} />
            )}
          </div>,
          (myTurn ? actionBox : sideBox)!,
        )}
      <div className="seat-info">
        <button
          type="button"
          className={`pname profile-btn ${pc(playerID)}`}
          aria-expanded={profileOpen}
          title={t.changeProfile}
          data-testid="profile-btn"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <PlayerToken p={playerID} />
          {profiles[playerID]?.name ? t.youNamed(profiles[playerID].name!) : t.youPlayer(playerID)}
          <span aria-hidden>▾</span>
        </button>
        {profileOpen && (
          <div className="profile-popover">
            <ProfilePicker
              value={profiles[playerID]}
              taken={Object.entries(profiles).flatMap(([q, pr]) => (q === playerID ? [] : [pr.color]))}
              onChange={onProfile}
            />
          </div>
        )}
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
            combos={combos(c)}
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
  const pc = usePlayerClass()
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
            <span className="muted">R{e.round}</span> {e.player != null && <strong className={`pname ${pc(e.player)}`}>{who(e.player)}</strong>} {t.log(e, helpers)}
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
  // Best first: total, then the tie-break.
  const ranked = [...G.scores].sort((a, b) => b.total - a.total || b.tiebreak - a.tiebreak)
  const rank = (i: number) => 1 + ranked.findIndex((s) => s.total === ranked[i].total && s.tiebreak === ranked[i].tiebreak)
  const medal = ['🥇', '🥈', '🥉']
  return (
    <div className="scores" data-testid="scores">
      <h3 className={`scores-headline ${G.winners?.includes(playerID) ? 'won' : ''}`}>
        {G.winners?.includes(playerID) ? t.youWin : t.winner((G.winners ?? []).map(who).join(' & '))}
      </h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th aria-label="#" />
              {t.scoreCols.map((c, i) => (
                <th key={c} title={i === 6 ? t.tiebreakTitle : i === 2 ? t.storedTitle : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => (
              <tr key={s.player} className={`${G.winners?.includes(s.player) ? 'winner' : ''} ${s.player === playerID ? 'me' : ''}`}>
                <td className="rank">{medal[rank(i) - 1] ?? rank(i)}</td>
                <td>
                  <PlayerName p={s.player} me={playerID} />
                </td>
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
