import './StatCard.css'

export default function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-text">
        <p className="stat-card-label">{label}</p>
        <h3 className="stat-card-value">{value}</h3>
      </div>
      <div className="stat-card-icon">{icon}</div>
    </div>
  )
}
