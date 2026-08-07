import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './NavigationProgress.css'

export default function NavigationProgress() {
  const location = useLocation()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const timers = useRef([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []

    setVisible(true)
    setWidth(0)

    requestAnimationFrame(() => setWidth(30))
    timers.current.push(setTimeout(() => setWidth(85), 200))
    timers.current.push(
      setTimeout(() => {
        setWidth(100)
        timers.current.push(
          setTimeout(() => {
            setVisible(false)
            setWidth(0)
          }, 400)
        )
      }, 500)
    )

    return () => timers.current.forEach(clearTimeout)
  }, [location.pathname])

  if (!visible) return null

  return (
    <div
      className="nav-progress"
      role="progressbar"
      aria-label="Page loading"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="nav-progress-bar"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
