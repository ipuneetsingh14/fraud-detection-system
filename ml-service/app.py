"""
FastAPI ML service. Loads the trained RandomForest and serves predictions.

Run:  uvicorn app:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import json
import os

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SAVE_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

app = FastAPI(title="Fraud Detection ML Service", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

model = None
meta = {"model_version": "unknown", "features": []}


@app.on_event("startup")
def load_model():
    global model, meta
    model_path = os.path.join(SAVE_DIR, "model.pkl")
    meta_path = os.path.join(SAVE_DIR, "meta.json")
    if not os.path.exists(model_path):
        raise RuntimeError("model.pkl not found. Run `python train.py` first.")
    model = joblib.load(model_path)
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            meta = json.load(f)
    print(f"Loaded model version: {meta.get('model_version')}")


class Transaction(BaseModel):
    amount: float = Field(..., ge=0)
    hour: int = Field(..., ge=0, le=23)
    location_mismatch: int = Field(0, ge=0, le=1)
    device_mismatch: int = Field(0, ge=0, le=1)
    velocity: int = Field(0, ge=0)
    avg_amount: float = Field(0, ge=0)


class Prediction(BaseModel):
    fraud: bool
    risk_score: float        # 0-100
    confidence: float        # probability of predicted class, 0-1
    risk_band: str           # Safe / Suspicious / Fraud
    model_version: str
    reasons: list[str]       # lightweight explainability


def explain(tx: Transaction) -> list[str]:
    """Cheap rule-based 'why' to back the model score (SHAP-lite)."""
    reasons = []
    if tx.avg_amount > 0 and tx.amount > 3 * tx.avg_amount:
        reasons.append(f"Amount is {tx.amount / tx.avg_amount:.1f}x the user's average")
    elif tx.amount > 50000:
        reasons.append(f"High transaction amount: {tx.amount:,.0f}")
    if tx.location_mismatch:
        reasons.append("Location differs from the user's usual location")
    if tx.device_mismatch:
        reasons.append("Transaction from a new/unrecognized device")
    if tx.velocity >= 3:
        reasons.append(f"{tx.velocity} transactions in the last 60 seconds (burst)")
    if tx.hour <= 5 or tx.hour >= 22:
        reasons.append(f"Unusual transaction time ({tx.hour:02d}:00)")
    if not reasons:
        reasons.append("No strong risk signals detected")
    return reasons


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None,
            "model_version": meta.get("model_version")}


@app.post("/predict", response_model=Prediction)
def predict(tx: Transaction):
    features = meta.get("features", [
        "amount", "hour", "location_mismatch",
        "device_mismatch", "velocity", "avg_amount",
    ])
    row = np.array([[getattr(tx, f) for f in features]], dtype=float)

    proba_fraud = float(model.predict_proba(row)[0, 1])
    is_fraud = proba_fraud >= 0.5
    risk_score = round(proba_fraud * 100, 2)
    band = "Safe" if risk_score <= 30 else "Suspicious" if risk_score <= 70 else "Fraud"

    return Prediction(
        fraud=is_fraud,
        risk_score=risk_score,
        confidence=round(proba_fraud if is_fraud else 1 - proba_fraud, 4),
        risk_band=band,
        model_version=meta.get("model_version", "unknown"),
        reasons=explain(tx),
    )
