# 🛡️ FraudGuard — AI-Powered Fraud Detection & Risk Analysis System

End-to-end fraud detection platform: **Python ML model + Node.js API + React dashboard + real-time alerts**.
Runs fully on free / open-source tools. Zero external accounts needed for local development.

```
React Dashboard (Vite + Tailwind + Recharts)
        │  REST + WebSocket (Socket.io)
        ▼
Node.js + Express API  ──►  PostgreSQL/SQLite (transactions, alerts, predictions)
        │  HTTP
        ▼
Python ML Service (FastAPI + scikit-learn RandomForest)
```

| Layer | Tech |
|-------|------|
| Frontend | React + Tailwind CSS + Recharts |
| Backend | Node.js + Express + Socket.io |
| ML | Python + FastAPI + scikit-learn (RandomForest) |
| Database | SQLite (default, zero-config) — easily swapped to PostgreSQL |
| Auth | JWT + bcrypt + role-based access |
| Realtime | Socket.io live transaction feed + alerts |

---

## 📁 Project structure

```
fraud-detection/
├── ml-service/        # Python FastAPI ML model
│   ├── train.py       # generates synthetic data + trains model
│   ├── app.py         # /predict + /health endpoints
│   └── requirements.txt
├── server/            # Node.js + Express backend
│   └── src/
│       ├── index.js           # app entry + Socket.io
│       ├── db.js              # SQLite schema
│       ├── seed.js            # demo users + sample transactions
│       ├── middleware/auth.js # JWT + RBAC
│       ├── routes/            # auth, transactions, alerts, analytics
│       └── services/          # feature engineering + ML client
└── client/            # React dashboard (Vite)
    └── src/
        ├── pages/     # Login, Dashboard, Transactions, Simulate, Alerts, Risk
        └── components/
```

---

## ✅ Prerequisites (all free)

- **Node.js 18+** — https://nodejs.org
- **Python 3.10+** — https://python.org

Check:
```powershell
node -v
python --version
```

---

## 🚀 Run it locally (3 terminals)

### 1) ML service (Python)

```powershell
cd fraud-detection\ml-service
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python train.py                # trains model -> saved_models/model.pkl
uvicorn app:app --port 8000    # serves http://localhost:8000  (docs at /docs)
```

### 2) Backend (Node.js)

```powershell
cd fraud-detection\server
copy .env.example .env          # macOS/Linux: cp .env.example .env
# open .env and set a JWT_SECRET (see "Required keys" below)
npm install
npm run seed                    # creates demo users + ~120 sample transactions
npm run dev                     # serves http://localhost:5000
```

### 3) Frontend (React)

```powershell
cd fraud-detection\client
copy .env.example .env          # macOS/Linux: cp .env.example .env
npm install
npm run dev                     # opens http://localhost:5173
```

Open **http://localhost:5173** and log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@demo.com` | `admin123` |
| User | `riya@demo.com` | `user123` |

> Tip: go to **Simulate Txn** → "Load risky preset" → Submit. Watch the
> **Dashboard** live feed and **Fraud Alerts** page update in real time.

---

## 🔑 Required keys & config files

You create **two** `.env` files from the provided `.env.example` templates.
Everything is free — no paid API keys are required.

### `server/.env`
| Variable | Required? | What to put |
|----------|-----------|-------------|
| `PORT` | optional | `5000` |
| `JWT_SECRET` | **required** | Any long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ML_SERVICE_URL` | optional | `http://localhost:8000` |
| `CLIENT_URL` | optional | `http://localhost:5173` |
| `DB_FILE` | optional | `./fraud.db` (SQLite path) |

### `client/.env`
| Variable | Required? | What to put |
|----------|-----------|-------------|
| `VITE_API_URL` | optional | `http://localhost:5000` |

**The only value you must set is `JWT_SECRET`.** All others have working defaults.

---

## 🧠 How the ML works

- `train.py` generates **synthetic, imbalanced** transaction data (so no Kaggle
  download is needed) and trains a **RandomForestClassifier** with
  `class_weight="balanced"`.
- Features (computed by the backend from each user's history):
  `amount`, `hour`, `location_mismatch`, `device_mismatch`, `velocity`, `avg_amount`.
- `/predict` returns `risk_score` (0–100), a `risk_band`
  (**Safe** 0–30 / **Suspicious** 31–70 / **Fraud** 71–100), and human-readable
  `reasons` (lightweight explainable AI).

**Use the real Kaggle dataset (optional):** download `creditcard.csv` from
[kaggle.com/mlg-ulb/creditcardfraud](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud),
load it in `train.py`, build the same feature columns, and call `train_model()`.

---

## 🗄️ Switching to PostgreSQL (free Neon / Supabase)

SQLite is the zero-config default. To use a free cloud Postgres instead:

1. Create a free DB at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
   and copy the connection string.
2. `npm install pg` in `server/`.
3. Replace `server/src/db.js` with a `pg` Pool, add `DATABASE_URL` to `.env`,
   and change `db.prepare(...).get/all/run` calls to `pool.query(...)`
   (SQL is standard; the `?`/`@named` placeholders become `$1, $2, …`).

---

## ☁️ Free deployment

| Part | Free host |
|------|-----------|
| Frontend (React) | **Vercel** or **Netlify** |
| Backend (Node) | **Render** free web service |
| ML service (Python) | **Render** or **Hugging Face Spaces** |
| Database | **Neon** or **Supabase** (free Postgres tier) |

Remember to set the same env vars in each host's dashboard, and update
`CLIENT_URL` / `VITE_API_URL` / `ML_SERVICE_URL` to the deployed URLs.

---

## 📡 API reference

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register (name, email, password) |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/transactions` | Create txn → ML score → store → maybe alert |
| GET | `/api/transactions` | List transactions |
| GET | `/api/transactions/:id` | Transaction + its prediction |
| GET | `/api/alerts` | Recent alerts |
| GET | `/api/analytics` | KPI summary |
| GET | `/api/analytics/by-location` | Fraud grouped by location |
| GET | `/api/analytics/trend` | Fraud trend per day |
| GET | `/api/analytics/high-risk-users` | Riskiest users |

ML service: `POST /predict`, `GET /health`, interactive docs at `/docs`.

---
