import './StatCard.css'

export default function StatCard({ label, value, icon, sub, subTone = 'neutral' }) {
  return (
    <div className="stat-card">
      <div className="stat-card-text">
        <p className="stat-card-label">{label}</p>
        <h3 className="stat-card-value">{value}</h3>
        {sub && <p className={`stat-card-sub stat-card-sub--${subTone}`}>{sub}</p>}
      </div>
      <div className="stat-card-icon">{icon}</div>
    </div>
  )
}
