import { Router } from "express";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// GET /api/alerts -> recent alerts with their transaction details
router.get("/", authRequired, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db
    .prepare(
      `SELECT a.*, t.amount, t.merchant, t.location, t.risk_score, t.user_id
       FROM alerts a JOIN transactions t ON t.id = a.transaction_id
       ${req.user.role === "admin" ? "" : "WHERE t.user_id = @uid"}
       ORDER BY a.created_at DESC LIMIT @limit`
    )
    .all({ uid: req.user.id, limit });
  res.json(rows);
});

export default router;
