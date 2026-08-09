import { useEffect, useRef, useState } from 'react'

// Tracks how long `loading` has been continuously true. Returns
// `showSlowNotice`, which only flips true once `loading` has been true for
// longer than `delay` (default 4000ms). If loading finishes before the delay
// (a normal fast load), the timeout is cleared and the notice never shows.
// The notice resets to false as soon as `loading` becomes false.
export default function useSlowLoadNotice(loading, delay = 4000) {
  const [showSlowNotice, setShowSlowNotice] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!loading) {
      // Loading finished (or hasn't started) — clear any pending timer and
      // hide the notice.
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setShowSlowNotice(false)
      return
    }

    // Loading is true — arm the delay timer only if one isn't already set.
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        setShowSlowNotice(true)
        timerRef.current = null
      }, delay)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [loading, delay])

  return showSlowNotice
}
