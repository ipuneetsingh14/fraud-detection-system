// Turns a raw transaction + the user's history into the 6 features the model
// expects. This is the "feature engineering" layer.
import db from "../db.js";

export function buildFeatures({ userId, amount, location, deviceId, transactionTime }) {
  const when = transactionTime ? new Date(transactionTime) : new Date();
  const hour = when.getHours();

  const history = db
    .prepare(`SELECT amount, location, device_id, transaction_time
              FROM transactions WHERE user_id = ?
              ORDER BY transaction_time DESC`)
    .all(userId);

  const avg_amount =
    history.length > 0
      ? history.reduce((s, t) => s + t.amount, 0) / history.length
      : amount;

  const usualLocation = mode(history.map((t) => t.location));
  const usualDevice = mode(history.map((t) => t.device_id));
  const location_mismatch = usualLocation && location !== usualLocation ? 1 : 0;
  const device_mismatch = usualDevice && deviceId !== usualDevice ? 1 : 0;

  // Velocity = number of the user's transactions in the 60s window ending at
  // `when`. Bound both ends: without the upper bound, backfilled/out-of-order
  // history (e.g. seeding) would also count future-dated transactions.
  const windowStart = new Date(when.getTime() - 60_000).toISOString();
  const whenIso = when.toISOString();
  const velocity = history.filter(
    (t) => t.transaction_time >= windowStart && t.transaction_time <= whenIso
  ).length;

  return {
    amount: Number(amount),
    hour,
    location_mismatch,
    device_mismatch,
    velocity,
    avg_amount: Number(avg_amount.toFixed(2)),
  };
}

function mode(arr) {
  const counts = {};
  let best = null;
  let bestCount = 0;
  for (const v of arr) {
    if (!v) continue;
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > bestCount) {
      bestCount = counts[v];
      best = v;
    }
  }
  return best;
}
