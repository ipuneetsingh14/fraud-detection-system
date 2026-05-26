import { useEffect, useState } from "react";
import { api, socket, connectSocket } from "../api";
import { Card } from "../components/ui";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get("/alerts?limit=100").then((r) => setAlerts(r.data));
    connectSocket();
    const onAlert = (a) => {
      setAlerts((prev) => [a, ...prev].slice(0, 100));
      setToast(a);
      setTimeout(() => setToast(null), 5000);
    };
    socket.on("alert", onAlert);
    return () => socket.off("alert", onAlert);
  }, []);

  const sev = {
    critical: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fraud Alerts</h1>
      <p className="text-sm text-slate-400">New high-risk transactions appear here instantly.</p>

      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-lg border border-rose-500/40 bg-rose-600/90 px-4 py-3 text-sm shadow-lg">
          🚨 New alert: {toast.message}
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((a) => (
          <Card key={a.id} className={`border ${sev[a.severity] || "border-slate-800"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{a.message}</p>
                <p className="text-xs text-slate-400">
                  {a.alert_type} · {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full border px-2.5 py-0.5 text-xs uppercase">{a.severity}</span>
            </div>
          </Card>
        ))}
        {alerts.length === 0 && <p className="text-sm text-slate-500">No alerts yet.</p>}
      </div>
    </div>
  );
}
