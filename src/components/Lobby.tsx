import { useState, type FormEvent } from 'react'
import type { MatchConfig } from '../hooks/useP2PMatch'

// No 0/O/1/I/L to keep tokens easy to read aloud and type.
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TOKEN_LENGTH = 6

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH))
  return Array.from(bytes, (b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('')
}

export function normalizeToken(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

interface Props {
  onStart: (config: MatchConfig) => void
  initialJoinToken?: string
}

export function Lobby({ onStart, initialJoinToken = '' }: Props) {
  const [joinToken, setJoinToken] = useState(initialJoinToken)
  const token = normalizeToken(joinToken)

  const join = (e: FormEvent) => {
    e.preventDefault()
    if (token) onStart({ role: 'guest', token })
  }

  return (
    <div className="lobby">
      <section className="panel">
        <h2>Host a game</h2>
        <p className="muted">Creates a room in this browser. Share the token with your opponent.</p>
        <button
          className="primary"
          data-testid="host-btn"
          onClick={() => onStart({ role: 'host', token: generateToken() })}
        >
          Host Game
        </button>
      </section>

      <section className="panel">
        <h2>Join a game</h2>
        <form onSubmit={join} className="join-form">
          <input
            data-testid="join-input"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            placeholder="Room token, e.g. K7PX2M"
            aria-label="Room token"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button type="submit" data-testid="join-btn" disabled={!token}>
            Join Game
          </button>
        </form>
      </section>
    </div>
  )
}
