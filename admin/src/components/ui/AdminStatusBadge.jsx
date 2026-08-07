import { statusKey } from '../../utils/format'

// ONE status badge used across the admin (Dashboard + Orders). Colours come
// from the global .status-pill + .status-{key} styles in index.css — subtle
// cream/gold/neutral/green/red. The status text is always visible, so colour
// is never the only indication of status.
export default function AdminStatusBadge({ status }) {
  const display = status || 'Pending'
  return <span className={`status-pill status-${statusKey(display)}`}>{display}</span>
}
