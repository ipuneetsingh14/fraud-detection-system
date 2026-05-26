// Small reusable presentational components.

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = "text-slate-100" }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export function RiskBadge({ band, score }) {
  const styles = {
    Safe: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Suspicious: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Fraud: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[band] || styles.Safe}`}>
      {band}{score != null ? ` · ${score}%` : ""}
    </span>
  );
}
