import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode is intentionally omitted: its double-mount would start, stop and
// restart the P2P client, and the PeerJS signaling server may briefly refuse to
// re-register the host's peer ID ("unavailable-id").
createRoot(document.getElementById('root')!).render(<App />)
