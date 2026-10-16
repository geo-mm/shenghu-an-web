import type { MatchConfig, MatchPlayer } from '../hooks/useP2PMatch'
import { useI18n } from '../i18n/I18n'

export type LinkStatus = 'connecting' | 'waiting' | 'connected' | 'error'

interface Props {
  status: LinkStatus
  config: MatchConfig
  players: MatchPlayer[]
  myPlayerID: string
}

export function ConnectionStatus({ status, config, players, myPlayerID }: Props) {
  const { t } = useI18n()
  return (
    <section className="panel status-panel" aria-live="polite">
      <div className="status-row">
        <span className={`dot dot-${status}`} aria-hidden />
        <strong data-testid="link-status" data-status={status}>
          {t.status[status]}
        </strong>
        <span className="muted">{t.asRole(config.role === 'host', config.token)}</span>
      </div>

      <h3>{t.players}</h3>
      <ul className="player-list" data-testid="player-list">
        {players.length === 0 && <li className="muted">{t.noPlayerData}</li>}
        {players.map((p) => (
          <li key={p.id}>
            <span className={`dot ${p.isConnected ? 'dot-connected' : 'dot-offline'}`} aria-hidden />
            {t.playerLabel(p.id)} {p.id === 0 ? t.hostTag : t.guestTag}
            {String(p.id) === myPlayerID && <span className="tag">{t.you}</span>}
            <span className="muted">{p.isConnected ? t.online : t.offline}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
