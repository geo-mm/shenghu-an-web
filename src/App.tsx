import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Lobby, normalizeToken } from './components/Lobby'
import { ConnectionStatus, type LinkStatus } from './components/ConnectionStatus'
import { Board } from './components/Board'
import { Gallery } from './components/Gallery'
import { DemoTable } from './components/DemoTable'
import { isBotLevel } from './game/ai'
import { HintsToggle } from './components/Hints'
import { Select } from './components/Select'
import { loadProfilePref } from './components/Players'
import { WaitingRoom } from './components/WaitingRoom'
import { HOST_PLAYER_ID, useP2PMatch, type MatchConfig } from './hooks/useP2PMatch'
import { useI18n } from './i18n/I18n'
import { LANGS, type Lang } from './i18n/messages'

const BOT_DELAY_MS = 900

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [config, setConfig] = useState<MatchConfig | null>(null)
  const { client, state, players, hostRegistered, error, playerID } = useP2PMatch(config)

  const initialJoinToken = useMemo(
    () => normalizeToken(new URLSearchParams(window.location.search).get('join') ?? ''),
    [],
  )

  const showGallery = useMemo(() => new URLSearchParams(window.location.search).has('gallery'), [])
  const demo = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const n = Number(params.get('demo'))
    const level = params.get('level')
    return params.has('demo')
      ? { numPlayers: n >= 2 && n <= 4 ? n : 2, expansion: params.has('expansion'), auto: params.has('auto'), level: isBotLevel(level) ? level : 'player' as const }
      : null
  }, [])
  const myPlayerID = playerID ?? HOST_PLAYER_ID
  const isHost = config?.role === 'host'
  // The host deals the game once the seats are filled (people and/or computer players).
  const gameStarted = config !== null && !!state?.G.started
  const inRoom = config !== null && !!state && !!client && !gameStarted

  // Once the game is up, send the colour and icon picked in the lobby (once per game).
  const sentProfile = useRef<string | null>(null)
  useEffect(() => {
    const pref = loadProfilePref()
    if (!state || !client || !config || !pref || sentProfile.current === config.token) return
    sentProfile.current = config.token
    const mine = state.G.profiles?.[myPlayerID]
    if (mine?.color !== pref.color || mine?.icon !== pref.icon || mine?.name !== pref.name) client.moves.setProfile(pref)
  }, [state, client, config, myPlayerID])

  // Host: when a computer player is to act, ask the game to play its move (after a short pause to follow along).
  const botStep = isHost && gameStarted && state && !state.ctx.gameover && state.G.bots.includes(state.G.actor) ? state._stateID : null
  useEffect(() => {
    if (botStep === null || !client) return
    const timer = window.setTimeout(() => client.moves.botTurn(), BOT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [botStep, client])

  let status: LinkStatus = 'connecting'
  if (error) status = 'error'
  else if (isHost ? !hostRegistered : !state?.isConnected) status = 'connecting'
  else status = gameStarted ? 'connected' : 'waiting'

  const leave = () => setConfig(null)
  const errorText = (e: { type: string; message: string }) =>
    e.type === 'unavailable-id'
      ? t.tokenInUse
      : e.type === 'game-started'
        ? t.gameStartedError
        : e.type === 'room-full'
          ? t.roomFullError
          : t.p2pError(e.type, e.message)

  const inviteLink = config ? `${location.origin}${location.pathname}?join=${config.token}` : ''

  return (
    <main className={`app ${(gameStarted && state) || demo ? 'in-game' : ''}`}>
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <div className="header-actions">
          <HintsToggle />
          <div className="lang-select">
            <span aria-hidden>🌐</span>
            <Select<Lang>
              value={lang}
              onChange={setLang}
              aria-label={t.language}
              data-testid="lang-select"
              options={LANGS.map((l) => ({ value: l.id, label: l.label }))}
            />
          </div>
          {config && (
            <button className="ghost" onClick={leave}>
              {t.leave}
            </button>
          )}
        </div>
      </header>

      {demo && !config && <DemoTable {...demo} />}
      {showGallery && !demo && !config && <Gallery />}
      {!showGallery && !demo && !config && <Lobby onStart={setConfig} initialJoinToken={initialJoinToken} />}

      {config && (
        <>
          {/* During the game, seats show who is offline instead. */}
          {!gameStarted && <ConnectionStatus status={status} config={config} />}

          {error && (
            <p className="error" role="alert" data-testid="p2p-error">
              {errorText(error)}
            </p>
          )}

          {isHost && !gameStarted && (
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

          {!isHost && status === 'connecting' && !error && <p className="muted">{t.lookingForHost(config.token)}</p>}

          {inRoom && <WaitingRoom G={state.G} players={players} playerID={myPlayerID} moves={client.moves} />}

          {gameStarted && state && client && (
            <Board state={state} playerID={myPlayerID} players={players} moves={client.moves} onLeave={leave} />
          )}
        </>
      )}

      <footer className="muted small">{t.footer}</footer>
    </main>
  )
}
