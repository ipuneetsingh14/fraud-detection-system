import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "../api";
import { Card } from "../components/ui";

const COLORS = { Safe: "#10b981", Suspicious: "#f59e0b", Fraud: "#f43f5e" };

export default function Risk() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/transactions?limit=500").then((r) => setRows(r.data));
    api.get("/analytics/high-risk-users").then((r) => setUsers(r.data));
  }, []);

  // Distribution across risk bands
  const dist = ["Safe", "Suspicious", "Fraud"].map((band) => ({
    name: band,
    value: rows.filter((t) => t.risk_band === band).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Risk Analysis</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-medium text-slate-300">Risk band distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={dist} dataKey="value" nameKey="name" outerRadius={100} label>
                {dist.map((d) => (
                  <Cell key={d.name} fill={COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-medium text-slate-300">Risk score legend</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500" /> 0–30 → Safe
            </li>
            <li className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-amber-500" /> 31–70 → Suspicious
            </li>
            <li className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-rose-500" /> 71–100 → Fraud
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Scores come from the RandomForest model's fraud probability. In fraud
            detection, <span className="text-slate-300">recall</span> matters most —
            catching as many real frauds as possible.
          </p>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-4 pt-4 text-sm font-medium text-slate-300">High-risk users</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Txns</th>
              <th className="px-4 py-3">Frauds</th>
              <th className="px-4 py-3">Avg Risk</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-b border-slate-800/60">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-slate-400">{u.email}</td>
                <td className="px-4 py-2">{u.total}</td>
                <td className="px-4 py-2 text-rose-400">{u.frauds}</td>
                <td className="px-4 py-2">{u.avg_risk}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No high-risk users yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
