import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { buildFeatures } from "../services/features.js";
import { predictFraud } from "../services/mlClient.js";

export default function transactionsRouter(io) {
  const router = Router();

  // POST /api/transactions -> create txn, score it, store, maybe alert
  router.post("/", authRequired, async (req, res) => {
    const {
      amount,
      merchant = "Unknown",
      location = "Unknown",
      device_id = "unknown-device",
      payment_method = "card",
    } = req.body || {};

    if (amount == null || isNaN(amount) || Number(amount) < 0)
      return res.status(400).json({ error: "Valid amount is required" });

    const transactionTime = new Date().toISOString();
    const userId = req.user.id;

    // 1. Feature engineering from history
    const features = buildFeatures({
      userId, amount, location, deviceId: device_id, transactionTime,
    });

    // 2. Ask the ML service for a prediction
    const pred = await predictFraud(features);

    // 3. Persist the transaction
    const txn = {
      id: uuid(),
      user_id: userId,
      amount: Number(amount),
      merchant, location, device_id, payment_method,
      transaction_time: transactionTime,
      is_fraud: pred.fraud ? 1 : 0,
      risk_score: pred.risk_score,
      risk_band: pred.risk_band,
    };
    db.prepare(
      `INSERT INTO transactions
        (id, user_id, amount, merchant, location, device_id, payment_method,
         transaction_time, is_fraud, risk_score, risk_band)
       VALUES
        (@id, @user_id, @amount, @merchant, @location, @device_id, @payment_method,
         @transaction_time, @is_fraud, @risk_score, @risk_band)`
    ).run(txn);

    // 4. Store the model prediction (audit trail)
    db.prepare(
      `INSERT INTO model_predictions
        (id, transaction_id, prediction, confidence, model_version, reasons, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuid(), txn.id, pred.fraud ? 1 : 0, pred.confidence,
      pred.model_version, JSON.stringify(pred.reasons || []), transactionTime
    );

    // 5. Raise an alert + push it live if risky
    let alert = null;
    if (pred.risk_score >= 70 || pred.fraud) {
      alert = {
        id: uuid(),
        transaction_id: txn.id,
        alert_type: "HIGH_RISK_TRANSACTION",
        severity: pred.risk_score >= 85 ? "critical" : "high",
        message: `Risk ${pred.risk_score}% on Rs.${Number(amount).toLocaleString()} at ${merchant}`,
        created_at: transactionTime,
      };
      db.prepare(
        `INSERT INTO alerts (id, transaction_id, alert_type, severity, message, created_at)
         VALUES (@id, @transaction_id, @alert_type, @severity, @message, @created_at)`
      ).run(alert);
      io.emit("alert", { ...alert, transaction: txn, reasons: pred.reasons });
    }

    io.emit("transaction", { ...txn, reasons: pred.reasons });
    res.status(201).json({ transaction: txn, prediction: pred, alert });
  });

  // GET /api/transactions -> recent (own, or all for admin)
  router.get("/", authRequired, (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows =
      req.user.role === "admin"
        ? db.prepare(`SELECT t.*, u.name AS user_name FROM transactions t
                      JOIN users u ON u.id = t.user_id
                      ORDER BY transaction_time DESC LIMIT ?`).all(limit)
        : db.prepare(`SELECT * FROM transactions WHERE user_id = ?
                      ORDER BY transaction_time DESC LIMIT ?`).all(req.user.id, limit);
    res.json(rows);
  });

  // GET /api/transactions/:id -> single txn + its prediction
  router.get("/:id", authRequired, (req, res) => {
    const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
    if (!txn) return res.status(404).json({ error: "Transaction not found" });
    if (req.user.role !== "admin" && txn.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    const prediction = db
      .prepare("SELECT * FROM model_predictions WHERE transaction_id = ?")
      .get(req.params.id);
    if (prediction?.reasons) prediction.reasons = JSON.parse(prediction.reasons);
    res.json({ transaction: txn, prediction });
  });

  return router;
}
