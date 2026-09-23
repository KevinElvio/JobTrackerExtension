export default function StatCard({ label, value, type }) {
  return (
    <div className={`stat-card stat-${type}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
