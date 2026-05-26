import { useState } from "react";
import { api } from "../api";
import { Card, RiskBadge } from "../components/ui";

const PRESETS = {
  normal: { amount: 1500, merchant: "Swiggy", location: "Mumbai", device_id: "device-A", payment_method: "upi" },
  risky: { amount: 95000, merchant: "Unknown Merchant", location: "Dubai", device_id: "device-NEW", payment_method: "card" },
};

export default function Simulate() {
  const [form, setForm] = useState(PRESETS.normal);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const { data } = await api.post("/transactions", { ...form, amount: Number(form.amount) });
      setResult(data);
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, type = "text") => (
    <label className="block text-sm">
      <span className="text-slate-400">{label}</span>
      <input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:border-indigo-500"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Simulate a Transaction</h1>
      <p className="text-sm text-slate-400">
        Submits a live transaction → backend builds features → ML model scores it →
        result is stored and broadcast to the dashboard in real time.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex gap-2">
            <button onClick={() => setForm(PRESETS.normal)} className="rounded-lg bg-emerald-600/20 px-3 py-1 text-xs text-emerald-300">Load normal preset</button>
            <button onClick={() => setForm(PRESETS.risky)} className="rounded-lg bg-rose-600/20 px-3 py-1 text-xs text-rose-300">Load risky preset</button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {field("amount", "Amount (₹)", "number")}
            {field("merchant", "Merchant")}
            {field("location", "Location")}
            {field("device_id", "Device ID")}
            {field("payment_method", "Payment method")}
            <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">
              {busy ? "Scoring…" : "Submit transaction"}
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-medium text-slate-300">Prediction result</h2>
          {!result ? (
            <p className="text-sm text-slate-500">Submit a transaction to see the AI risk assessment.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <RiskBadge band={result.prediction.risk_band} score={result.prediction.risk_score} />
                <span className="text-sm text-slate-400">model: {result.prediction.model_version}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full ${result.prediction.risk_score > 70 ? "bg-rose-500" : result.prediction.risk_score > 30 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${result.prediction.risk_score}%` }}
                />
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Why this score (Explainable AI)</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-300">
                  {result.prediction.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              {result.alert && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                  🚨 Alert raised — severity: {result.alert.severity}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
