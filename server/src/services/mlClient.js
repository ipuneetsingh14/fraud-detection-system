// Talks to the Python ML service. Includes a safe fallback so the backend
// keeps working (with a rule-based score) even if the ML service is down.
import axios from "axios";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function predictFraud(features) {
  try {
    const { data } = await axios.post(`${ML_URL}/predict`, features, { timeout: 4000 });
    return data;
  } catch (err) {
    console.warn("[mlClient] ML service unavailable, using fallback:", err.message);
    return ruleBasedFallback(features);
  }
}

// Heuristic used only if the ML API can't be reached.
function ruleBasedFallback(f) {
  let score = 0;
  if (f.avg_amount > 0 && f.amount > 3 * f.avg_amount) score += 35;
  else if (f.amount > 50000) score += 25;
  if (f.location_mismatch) score += 20;
  if (f.device_mismatch) score += 20;
  if (f.velocity >= 3) score += 20;
  if (f.hour <= 5 || f.hour >= 22) score += 10;
  score = Math.min(score, 99);

  const reasons = [];
  if (f.location_mismatch) reasons.push("Location differs from usual");
  if (f.device_mismatch) reasons.push("New/unrecognized device");
  if (f.velocity >= 3) reasons.push(`${f.velocity} txns in last 60s`);
  if (reasons.length === 0) reasons.push("No strong risk signals (fallback)");

  const band = score <= 30 ? "Safe" : score <= 70 ? "Suspicious" : "Fraud";
  return {
    fraud: score >= 50,
    risk_score: score,
    confidence: 0.5,
    risk_band: band,
    model_version: "fallback-rules",
    reasons,
  };
}
