import { useEffect, useState } from "react";
import { api } from "../api";
import { Card, RiskBadge } from "../components/ui";

export default function Transactions() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/transactions?limit=200").then((r) => setRows(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transaction History</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="px-4 py-2 text-slate-400">
                  {new Date(t.transaction_time).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-medium">₹{Number(t.amount).toLocaleString()}</td>
                <td className="px-4 py-2">{t.merchant}</td>
                <td className="px-4 py-2">{t.location}</td>
                <td className="px-4 py-2 text-slate-400">{t.payment_method}</td>
                <td className="px-4 py-2"><RiskBadge band={t.risk_band} score={t.risk_score} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
