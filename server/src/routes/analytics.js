import { Router } from "express";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// Admins see global analytics; users see their own.
function scope(req) {
  return req.user.role === "admin"
    ? { where: "", params: {} }
    : { where: "WHERE user_id = @uid", params: { uid: req.user.id } };
}

// GET /api/analytics -> KPIs for the dashboard cards
router.get("/", authRequired, (req, res) => {
  const { where, params } = scope(req);
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total_transactions,
              SUM(is_fraud) AS fraud_count,
              SUM(amount) AS total_amount,
              AVG(risk_score) AS avg_risk
       FROM transactions ${where}`
    )
    .get(params);

  const fraudRate = totals.total_transactions
    ? (totals.fraud_count / totals.total_transactions) * 100
    : 0;

  res.json({
    total_transactions: totals.total_transactions || 0,
    fraud_count: totals.fraud_count || 0,
    fraud_rate: Number(fraudRate.toFixed(2)),
    total_amount: Number((totals.total_amount || 0).toFixed(2)),
    avg_risk: Number((totals.avg_risk || 0).toFixed(2)),
  });
});

// GET /api/analytics/by-location
router.get("/by-location", authRequired, (req, res) => {
  const { where, params } = scope(req);
  res.json(
    db.prepare(
      `SELECT location, COUNT(*) AS total, SUM(is_fraud) AS frauds
       FROM transactions ${where}
       GROUP BY location ORDER BY frauds DESC, total DESC LIMIT 10`
    ).all(params)
  );
});

// GET /api/analytics/trend -> fraud vs total per day
router.get("/trend", authRequired, (req, res) => {
  const { where, params } = scope(req);
  res.json(
    db.prepare(
      `SELECT substr(transaction_time, 1, 10) AS day,
              COUNT(*) AS total, SUM(is_fraud) AS frauds
       FROM transactions ${where}
       GROUP BY day ORDER BY day ASC LIMIT 30`
    ).all(params)
  );
});

// GET /api/analytics/high-risk-users
router.get("/high-risk-users", authRequired, (req, res) => {
  const { where, params } = scope(req);
  res.json(
    db.prepare(
      `SELECT t.user_id, u.name, u.email,
              COUNT(*) AS total, SUM(t.is_fraud) AS frauds,
              ROUND(AVG(t.risk_score), 2) AS avg_risk
       FROM transactions t JOIN users u ON u.id = t.user_id
       ${where}
       GROUP BY t.user_id
       HAVING frauds > 0 OR avg_risk > 50
       ORDER BY avg_risk DESC LIMIT 10`
    ).all(params)
  );
});

export default router;
