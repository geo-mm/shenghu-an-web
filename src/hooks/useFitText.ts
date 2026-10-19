import { useLayoutEffect, type RefObject } from 'react'

/** Laid-out width of the element's text, in fractional pixels (scrollWidth rounds, hiding a sub-pixel overflow). */
function textWidth(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  return range.getBoundingClientRect().width
}

/** How much the content must shrink to fit: 1 when it fits, below 1 when it doesn't. */
function fitRatio(el: HTMLElement) {
  // Even a fraction of a pixel too wide makes the browser show an ellipsis.
  const width = el.getBoundingClientRect().width / Math.max(textWidth(el), 0.01)
  const height = el.clientHeight / Math.max(el.scrollHeight, 1)
  return Math.min(1, width + 1e-4, height) // tolerance for float noise when the text exactly fills its box
}

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
      for (let i = 0, ratio = fitRatio(el); i < 10 && ratio < 1; i++, ratio = fitRatio(el)) {
        const size = parseFloat(getComputedStyle(el).fontSize)
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
