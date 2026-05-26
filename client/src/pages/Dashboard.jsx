import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { api, socket, connectSocket } from "../api";
import { Card, StatCard, RiskBadge } from "../components/ui";

export default function Dashboard() {
  const [kpi, setKpi] = useState(null);
  const [byLocation, setByLocation] = useState([]);
  const [trend, setTrend] = useState([]);
  const [live, setLive] = useState([]);

  useEffect(() => {
    api.get("/analytics").then((r) => setKpi(r.data));
    api.get("/analytics/by-location").then((r) => setByLocation(r.data));
    api.get("/analytics/trend").then((r) => setTrend(r.data));

    connectSocket();
    const onTxn = (txn) => setLive((prev) => [txn, ...prev].slice(0, 8));
    socket.on("transaction", onTxn);
    return () => socket.off("transaction", onTxn);
  }, []);

  if (!kpi) return <p className="text-slate-400">Loading analytics…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fraud Analytics Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Transactions" value={kpi.total_transactions} />
        <StatCard label="Frauds Detected" value={kpi.fraud_count} accent="text-rose-400" />
        <StatCard label="Fraud Rate" value={`${kpi.fraud_rate}%`} accent="text-amber-400" />
        <StatCard label="Avg Risk Score" value={kpi.avg_risk} sub="0–100" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-medium text-slate-300">Fraud trend over time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#6366f1" name="Total" />
              <Line type="monotone" dataKey="frauds" stroke="#f43f5e" name="Frauds" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-medium text-slate-300">Fraud by location</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byLocation}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="location" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
              <Legend />
              <Bar dataKey="total" fill="#6366f1" name="Total" />
              <Bar dataKey="frauds" fill="#f43f5e" name="Frauds" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-slate-300">
          🔴 Live transaction feed (real-time via Socket.io)
        </h2>
        {live.length === 0 ? (
          <p className="text-sm text-slate-500">
            Waiting for transactions… open the “Simulate Txn” page to generate one.
          </p>
        ) : (
          <ul className="space-y-2">
            {live.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm">
                <span>₹{Number(t.amount).toLocaleString()} · {t.merchant} · {t.location}</span>
                <RiskBadge band={t.risk_band} score={t.risk_score} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
