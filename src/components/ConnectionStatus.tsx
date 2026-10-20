import type { MatchConfig } from '../hooks/useP2PMatch'
import { useI18n } from '../i18n/I18n'

export type LinkStatus = 'connecting' | 'waiting' | 'connected' | 'error'

interface Props {
  status: LinkStatus
  config: MatchConfig
}

/** Link status line; the seats themselves are listed in the waiting room. */
export function ConnectionStatus({ status, config }: Props) {
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
    </section>
  )
}
