import { useMemo, useState } from 'react'
import './App.css'
import { Lobby, normalizeToken } from './components/Lobby'
import { ConnectionStatus, type LinkStatus } from './components/ConnectionStatus'
import { Board } from './components/Board'
import { GUEST_PLAYER_ID, HOST_PLAYER_ID, useP2PMatch, type MatchConfig } from './hooks/useP2PMatch'

export default function App() {
  const [config, setConfig] = useState<MatchConfig | null>(null)
  const { client, state, players, hostRegistered, error } = useP2PMatch(config)
  const [startedToken, setStartedToken] = useState<string | null>(null)

  const initialJoinToken = useMemo(
    () => normalizeToken(new URLSearchParams(window.location.search).get('join') ?? ''),
    [],
  )

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
        <h1>San Juan · P2P</h1>
        {config && (
          <button className="ghost" onClick={leave}>
            Leave
          </button>
        )}
      </header>

      {!config && <Lobby onStart={setConfig} initialJoinToken={initialJoinToken} />}

      {config && (
        <>
          <ConnectionStatus status={status} config={config} players={players} myPlayerID={myPlayerID} />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {config.role === 'host' && !gameStarted && (
            <section className="panel token-panel">
              <h2>Room token</h2>
              <div className="token" data-testid="room-token">
                {config.token}
              </div>
              <p className="muted">Ask your opponent to enter this token under “Join Game”, or send them the link:</p>
              <div className="invite">
                <code>{inviteLink}</code>
                <button onClick={() => navigator.clipboard?.writeText(inviteLink)}>Copy link</button>
              </div>
            </section>
          )}

          {config.role === 'guest' && status === 'connecting' && !error && (
            <p className="muted">
              Looking for host of room <code>{config.token}</code>… (retrying automatically)
            </p>
          )}

          {gameStarted && state && client && (
            <Board state={state} playerID={myPlayerID} players={players} onDraw={() => client.moves.drawCard()} />
          )}
        </>
      )}

      <footer className="muted small">
        Pure peer-to-peer via WebRTC: the host’s browser runs the authoritative game state. A PeerJS signaling
        server is only used to introduce the two peers.
      </footer>
    </main>
  )
}
