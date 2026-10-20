import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/I18n'
import { HintsProvider } from './components/Hints'
import { applyUiArt } from './art'

applyUiArt()

// StrictMode is intentionally omitted: its double-mount would start, stop and
// restart the P2P client, and the PeerJS signaling server may briefly refuse to
// re-register the host's peer ID ("unavailable-id").
createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <HintsProvider>
      <App />
    </HintsProvider>
  </I18nProvider>,
)
