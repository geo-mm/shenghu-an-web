import { useMemo, useState } from 'react'
import './App.css'
import { Lobby, normalizeToken } from './components/Lobby'
import { ConnectionStatus, type LinkStatus } from './components/ConnectionStatus'
import { Board } from './components/Board'
import { Gallery } from './components/Gallery'
import { GUEST_PLAYER_ID, HOST_PLAYER_ID, useP2PMatch, type MatchConfig } from './hooks/useP2PMatch'
import { useI18n } from './i18n/I18n'
import { LANGS, type Lang } from './i18n/messages'

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [config, setConfig] = useState<MatchConfig | null>(null)
  const { client, state, players, hostRegistered, error } = useP2PMatch(config)
  const [startedToken, setStartedToken] = useState<string | null>(null)

  const initialJoinToken = useMemo(
    () => normalizeToken(new URLSearchParams(window.location.search).get('join') ?? ''),
    [],
  )

  const showGallery = useMemo(() => new URLSearchParams(window.location.search).has('gallery'), [])
  const myPlayerID = config?.role === 'host' ? HOST_PLAYER_ID : GUEST_PLAYER_ID
  const allConnected = players.length > 0 && players.every((p) => p.isConnected)

  // Once both players have been connected, keep the board up even if someone
  // drops, so a reconnect resumes the same view. (State adjusted during render.)
  if (config && allConnected && startedToken !== config.token) setStartedToken(config.token)
  const gameStarted = config !== null && startedToken === config.token

  let status: LinkStatus = 'connecting'
  if (error) status = 'error'
  else if (config?.role === 'host' ? !hostRegistered : !state?.isConnected) status = 'connecting'
  else status = allConnected ? 'connected' : 'waiting'

  const leave = () => {
    setConfig(null)
    setStartedToken(null)
  }

  const inviteLink = config ? `${location.origin}${location.pathname}?join=${config.token}` : ''

  return (
    <main className="app">
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <div className="header-actions">
          <label className="lang-select">
            <span className="sr-only">{t.language}</span>
            <span aria-hidden>🌐</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} data-testid="lang-select" aria-label={t.language}>
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {config && (
            <button className="ghost" onClick={leave}>
              {t.leave}
            </button>
          )}
        </div>
      </header>

      {showGallery && !config && <Gallery />}
      {!showGallery && !config && <Lobby onStart={setConfig} initialJoinToken={initialJoinToken} />}

      {config && (
        <>
          <ConnectionStatus status={status} config={config} players={players} myPlayerID={myPlayerID} />

          {error && (
            <p className="error" role="alert">
              {error.type === 'unavailable-id' ? t.tokenInUse : t.p2pError(error.type, error.message)}
            </p>
          )}

          {config.role === 'host' && !gameStarted && (
            <section className="panel token-panel">
              <h2>{t.roomToken}</h2>
              <div className="token" data-testid="room-token">
                {config.token}
              </div>
              <p className="muted">{t.shareHint}</p>
              <div className="invite">
                <code>{inviteLink}</code>
                <button onClick={() => navigator.clipboard?.writeText(inviteLink)}>{t.copyLink}</button>
              </div>
            </section>
          )}

          {config.role === 'guest' && status === 'connecting' && !error && (
            <p className="muted">{t.lookingForHost(config.token)}</p>
          )}

          {gameStarted && state && client && (
            <Board state={state} playerID={myPlayerID} players={players} moves={client.moves} />
          )}
        </>
      )}

      <footer className="muted small">{t.footer}</footer>
    </main>
  )
}
