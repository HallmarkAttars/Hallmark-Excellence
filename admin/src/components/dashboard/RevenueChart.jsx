// Dependency-free responsive SVG area chart (no chart library). Renders real
// dashboard revenue buckets; handles sparse data and the empty state.

import { useMemo, useState } from 'react'
import { formatINR } from '../../utils/format'

const W = 640
const H = 230
const PAD = { top: 16, right: 14, bottom: 28, left: 52 }

// Compact axis label: ₹2.3k / ₹500 — keeps the y-axis readable.
function compactINR(value) {
  const n = Number(value) || 0
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `₹${n}`
}

export default function RevenueChart({ points }) {
  const [hover, setHover] = useState(null)
  const list = Array.isArray(points) ? points : []

  const chart = useMemo(() => {
    if (list.length === 0) return null
    const values = list.map((p) => Number(p.value) || 0)
    const max = Math.max(...values, 1)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const stepX = list.length > 1 ? innerW / (list.length - 1) : innerW
    const x = (i) => PAD.left + (list.length > 1 ? i * stepX : innerW / 2)
    const y = (v) => PAD.top + innerH - (v / max) * innerH
    const coords = list.map((p, i) => ({ x: x(i), y: y(Number(p.value) || 0), value: Number(p.value) || 0, label: p.label }))
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
    const area = `${line} L${x(list.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`
    return { max, coords, line, area, stepX, innerH }
  }, [list])

  if (!chart) {
    return <p className="dash-chart-empty">No revenue data available for this period.</p>
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + chart.innerH * (1 - f),
    value: chart.max * f,
  }))

  const labelEvery = Math.max(1, Math.ceil(list.length / 7))

  const handleMove = (e) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    if (!rect.width) return
    const ratio = W / rect.width
    const svgX = (e.clientX - rect.left) * ratio
    const raw = Math.round((svgX - PAD.left) / chart.stepX)
    const idx = Math.max(0, Math.min(list.length - 1, raw))
    setHover({ idx, ...chart.coords[idx] })
  }

  return (
    <div className="dash-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="dash-chart-svg"
        role="img"
        aria-label="Revenue over the selected period"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8862B" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#B8862B" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y gridlines + labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={g.y} y2={g.y} stroke="rgba(20,17,13,0.08)" strokeWidth="1" />
            <text x={PAD.left - 8} y={g.y + 3} textAnchor="end" className="dash-chart-axis">{compactINR(g.value)}</text>
          </g>
        ))}

        {/* Area + line */}
        <path d={chart.area} fill="url(#dashRevenueFill)" />
        <path d={chart.line} fill="none" stroke="#B8862B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover dot + tooltip */}
        {hover && (
          <g pointerEvents="none">
            <circle cx={hover.x} cy={hover.y} r="4.5" fill="#171512" stroke="#fff" strokeWidth="1.5" />
            <g transform={`translate(${Math.min(Math.max(hover.x, 74), W - 74)}, ${Math.max(hover.y - 44, 8)})`}>
              <rect width="148" height="36" rx="5" fill="#171512" />
              <text x="74" y="15" textAnchor="middle" fill="#B8862B" fontSize="9" letterSpacing="1">{(list[hover.idx]?.label || '').toUpperCase()}</text>
              <text x="74" y="29" textAnchor="middle" fill="#FAF7F1" fontSize="12" fontWeight="700">{formatINR(hover.value)}</text>
            </g>
          </g>
        )}

        {/* X labels (thinned on small screens via CSS font-size) */}
        {chart.coords.map((c, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={c.x} y={H - 8} textAnchor="middle" className="dash-chart-axis">{c.label}</text>
          ) : null
        )}
      </svg>
    </div>
  )
}
