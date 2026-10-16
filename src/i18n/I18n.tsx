import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MESSAGES, type Lang, type Messages } from './messages'

const STORAGE_KEY = 'sanjuan-lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh-TW') return saved
  } catch {
    // Storage may be unavailable (private mode); fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages
}

const I18nContext = createContext<I18n>({ lang: 'en', setLang: () => {}, t: MESSAGES.en })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18n>(
    () => ({
      lang,
      t: MESSAGES[lang],
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Not persisted; the choice still applies for this visit.
        }
      },
    }),
    [lang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}
