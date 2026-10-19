import { useLayoutEffect, type RefObject } from 'react'

// Strict: even a fraction of a pixel too wide makes the browser show an ellipsis.
const overflows = (el: HTMLElement) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight

/**
 * Shrinks the element's font until its content fits its box, so text never
 * gets cut off whatever font the browser ends up using. Re-fits when the
 * card is resized or web fonts finish loading.
 */
export function useFitText(ref: RefObject<HTMLElement | null>, content: string) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.fontSize = '' // start again from the size the CSS gives
      for (let i = 0; i < 10 && overflows(el); i++) {
        const size = parseFloat(getComputedStyle(el).fontSize)
        const ratio = Math.min(el.clientWidth / el.scrollWidth, el.clientHeight / el.scrollHeight)
        el.style.fontSize = `${size * Math.min(0.95, Math.sqrt(ratio))}px`
      }
    }
    fit()
    // Watch the card rather than the element itself, whose size the fitting changes.
    const observer = new ResizeObserver(fit)
    observer.observe(el.closest('.sj-card') ?? el)
    document.fonts?.addEventListener('loadingdone', fit)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', fit)
    }
  }, [ref, content])
}
