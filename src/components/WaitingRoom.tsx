import { BOT_LEVELS, type BotLevel } from '../game/ai'
import { HOST_SEAT } from '../game/SanJuanGame'
import type { SanJuanState } from '../game/state'
import type { MatchPlayer } from '../hooks/useP2PMatch'
import { useI18n } from '../i18n/I18n'
import { PlayerToken, PlayersProvider, usePlayerName } from './Players'
import { Select } from './Select'

interface Props {
  G: SanJuanState
  players: MatchPlayer[]
  playerID: string
  moves: Record<string, (...args: unknown[]) => void>
}

/**
 * Before the game: the room's seats. Friends who join take a free seat; the
 * host can put the computer in empty seats and starts as soon as 2+ are filled.
 */
export function WaitingRoom(props: Props) {
  return (
    <PlayersProvider G={props.G}>
      <Room {...props} />
    </PlayersProvider>
  )
}

function Room({ G, players, playerID, moves }: Props) {
  const name = usePlayerName()
  const { t } = useI18n()
  const isHost = playerID === HOST_SEAT
  const humans = players.filter((p) => p.isConnected).map((p) => String(p.id))
  const seated = [...new Set([...humans, ...G.bots])]

  return (
    <>
      <section className="panel waiting-room" data-testid="waiting-room">
        <h2>{t.seatsTitle}</h2>
        <ul className="seat-list">
          {players.map((pl) => {
            const seat = String(pl.id)
            const bot = G.bots.includes(seat)
            const human = humans.includes(seat)
            return (
              <li key={seat} className={`seat-row ${human || bot ? 'filled' : 'empty'}`} data-testid={`seat-${seat}`}>
                {human || bot ? <PlayerToken p={seat} /> : <span className="ptoken empty" aria-hidden />}
                <span className="seat-name">
                  {human || bot ? name(seat, playerID) : t.seatEmpty}
                </span>
                {seat === HOST_SEAT && <span className="tag">{t.hostLabel}</span>}
                {bot && <span className="tag bot-tag">AI</span>}
                {bot &&
                  (isHost ? (
                    <Select<BotLevel>
                      className="bot-level"
                      aria-label={t.botLevelLabel}
                      data-testid={`level-${seat}`}
                      value={G.botLevels[seat] ?? 'player'}
                      onChange={(level) => moves.setBot(seat, level)}
                      options={BOT_LEVELS.map((l) => ({ value: l, label: t.botLevels[l] }))}
                    />
                  ) : (
                    <span className="muted small">{t.botLevels[G.botLevels[seat] ?? 'player']}</span>
                  ))}
                {isHost && !human && seat !== HOST_SEAT && (
                  <button className="small-btn" data-testid={`bot-${seat}`} onClick={() => moves.setBot(seat, bot ? null : 'player')}>
                    {bot ? t.removeBot : t.addBot}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {isHost ? (
          <div className="actions">
            <button
              className="primary"
              data-testid="start-game"
              disabled={seated.length < 2}
              onClick={() => moves.startGame({ humans, bots: G.bots })}
            >
              {t.startGame(seated.length)}
            </button>
            {seated.length < 2 && <span className="muted small">{t.needTwoPlayers}</span>}
          </div>
        ) : (
          <p className="muted">{t.waitingForHost}</p>
        )}
      </section>
    </>
  )
}
