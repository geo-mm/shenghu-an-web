import type { MatchConfig, MatchPlayer } from '../hooks/useP2PMatch'

export type LinkStatus = 'connecting' | 'waiting' | 'connected' | 'error'

const LABELS: Record<LinkStatus, string> = {
  connecting: 'Connecting',
  waiting: 'Waiting for opponent',
  connected: 'Connected',
  error: 'Error',
}

interface Props {
  status: LinkStatus
  config: MatchConfig
  players: MatchPlayer[]
  myPlayerID: string
}

export function ConnectionStatus({ status, config, players, myPlayerID }: Props) {
  return (
    <section className="panel status-panel" aria-live="polite">
      <div className="status-row">
        <span className={`dot dot-${status}`} aria-hidden />
        <strong data-testid="link-status">{LABELS[status]}</strong>
        <span className="muted">
          as {config.role === 'host' ? 'Host' : 'Guest'} · room <code>{config.token}</code>
        </span>
      </div>

      <h3>Players</h3>
      <ul className="player-list" data-testid="player-list">
        {players.length === 0 && <li className="muted">No player data yet…</li>}
        {players.map((p) => (
          <li key={p.id}>
            <span className={`dot ${p.isConnected ? 'dot-connected' : 'dot-offline'}`} aria-hidden />
            Player {p.id} {p.id === 0 ? '(Host)' : '(Guest)'}
            {String(p.id) === myPlayerID && <span className="tag">you</span>}
            <span className="muted">{p.isConnected ? 'online' : 'offline'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
