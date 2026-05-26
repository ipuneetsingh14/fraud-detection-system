// Seeds demo users + historical transactions so the dashboard has data
// immediately. Run:  npm run seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "./db.js";
import { buildFeatures } from "./services/features.js";
import { predictFraud } from "./services/mlClient.js";

const LOCATIONS = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Dubai", "London"];
const MERCHANTS = ["Amazon", "Flipkart", "Swiggy", "Uber", "Apple Store", "Local ATM", "Unknown Merchant"];
const DEVICES = ["device-A", "device-B", "device-C", "device-NEW"];
const METHODS = ["card", "upi", "netbanking", "wallet"];
const rand = (a) => a[Math.floor(Math.random() * a.length)];

async function run() {
  const users = [
    { id: uuid(), name: "Admin User", email: "admin@demo.com", password: "admin123", role: "admin" },
    { id: uuid(), name: "Riya Sharma", email: "riya@demo.com", password: "user123", role: "user" },
    { id: uuid(), name: "Arjun Mehta", email: "arjun@demo.com", password: "user123", role: "user" },
  ];

  for (const u of users) {
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
    if (exists) { u.id = exists.id; continue; }
    db.prepare(
      `INSERT INTO users (id, name, email, password, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(u.id, u.name, u.email, bcrypt.hashSync(u.password, 10), u.role, new Date().toISOString());
  }

  // Start from a clean slate so re-running the seed doesn't pile up data.
  db.prepare("DELETE FROM model_predictions").run();
  db.prepare("DELETE FROM alerts").run();
  db.prepare("DELETE FROM transactions").run();

  // Each real user has a "home" location + device. Normal activity stays on
  // these; suspicious activity deviates (foreign location, new device).
  const realUsers = users
    .filter((u) => u.role === "user")
    .map((u, i) => ({ ...u, home: LOCATIONS[i % 5], device: DEVICES[i % 3] }));
  const NUM = 120;
  console.log(`Seeding ${NUM} transactions...`);

  for (let i = 0; i < NUM; i++) {
    const user = rand(realUsers);
    // ~18% of transactions are crafted to look suspicious; the rest are normal.
    const suspicious = Math.random() < 0.18;

    // Realistic timing: normal txns happen during the day, suspicious ones at night.
    const d = new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000);
    const hour = suspicious ? Math.floor(Math.random() * 6) : 9 + Math.floor(Math.random() * 12);
    d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
    const time = d.toISOString();

    const amount = suspicious
      ? Math.round(20000 + Math.random() * 150000)
      : Math.round(100 + Math.random() * 6000);
    // Normal txns occasionally use a different city (travel), but usually home.
    const location = suspicious
      ? rand(["Dubai", "London"])
      : Math.random() < 0.85 ? user.home : rand(LOCATIONS.slice(0, 5));
    const device_id = suspicious
      ? "device-NEW"
      : Math.random() < 0.9 ? user.device : rand(DEVICES.slice(0, 3));

    const features = buildFeatures({ userId: user.id, amount, location, deviceId: device_id, transactionTime: time });
    const pred = await predictFraud(features);

    const txn = {
      id: uuid(), user_id: user.id, amount,
      merchant: rand(MERCHANTS), location, device_id,
      payment_method: rand(METHODS), transaction_time: time,
      is_fraud: pred.fraud ? 1 : 0, risk_score: pred.risk_score, risk_band: pred.risk_band,
    };
    db.prepare(
      `INSERT INTO transactions
        (id, user_id, amount, merchant, location, device_id, payment_method,
         transaction_time, is_fraud, risk_score, risk_band)
       VALUES
        (@id, @user_id, @amount, @merchant, @location, @device_id, @payment_method,
         @transaction_time, @is_fraud, @risk_score, @risk_band)`
    ).run(txn);

    if (pred.risk_score >= 70 || pred.fraud) {
      db.prepare(
        `INSERT INTO alerts (id, transaction_id, alert_type, severity, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        uuid(), txn.id, "HIGH_RISK_TRANSACTION",
        pred.risk_score >= 85 ? "critical" : "high",
        `Risk ${pred.risk_score}% on Rs.${amount} at ${txn.merchant}`, time
      );
    }
  }

  console.log("Seed complete.");
  console.log("Login as ADMIN -> admin@demo.com / admin123");
  console.log("Login as USER  -> riya@demo.com  / user123");
}

run();
