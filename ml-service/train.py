"""
Train a fraud-detection model on SYNTHETIC data.

Why synthetic? It lets the project run end-to-end with zero external downloads.
The feature schema below matches exactly what the Node backend sends to
/predict, so the whole pipeline stays consistent.

To use the real Kaggle "Credit Card Fraud Detection" dataset instead:
  1. Download creditcard.csv from kaggle.com/mlg-ulb/creditcardfraud
  2. Load it with pandas, build the same feature columns, then call train_model().

Run:    python train.py
Output: saved_models/model.pkl  +  saved_models/meta.json
"""
import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

SAVE_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_VERSION = "rf-v1"

# The 6 features the backend computes for every transaction.
FEATURES = [
    "amount",            # transaction amount
    "hour",              # hour of day 0-23
    "location_mismatch", # 1 if location differs from user's usual location
    "device_mismatch",   # 1 if device differs from user's usual device
    "velocity",          # number of txns by this user in the last 60s
    "avg_amount",        # user's historical average transaction amount
]


def generate_synthetic_data(n: int = 40000, fraud_rate: float = 0.05, seed: int = 42):
    """Create a realistic, imbalanced transaction dataset."""
    rng = np.random.default_rng(seed)
    n_fraud = int(n * fraud_rate)
    n_legit = n - n_fraud

    # Legitimate: small amounts, daytime, familiar device/location
    legit = pd.DataFrame({
        "amount": rng.gamma(2.0, 900, n_legit).clip(10, 80000),
        "hour": rng.integers(6, 23, n_legit),
        "location_mismatch": rng.choice([0, 1], n_legit, p=[0.95, 0.05]),
        "device_mismatch": rng.choice([0, 1], n_legit, p=[0.97, 0.03]),
        "velocity": rng.choice([0, 1, 2], n_legit, p=[0.7, 0.25, 0.05]),
        "avg_amount": rng.gamma(2.0, 900, n_legit).clip(10, 50000),
        "is_fraud": 0,
    })

    # Fraudulent: larger/odd amounts, odd hours, mismatches, bursts
    fraud = pd.DataFrame({
        "amount": rng.gamma(3.0, 6000, n_fraud).clip(10, 200000),
        "hour": rng.choice(list(range(0, 6)) + list(range(22, 24)), n_fraud),
        "location_mismatch": rng.choice([0, 1], n_fraud, p=[0.35, 0.65]),
        "device_mismatch": rng.choice([0, 1], n_fraud, p=[0.4, 0.6]),
        "velocity": rng.choice([0, 1, 3, 5, 8], n_fraud, p=[0.1, 0.2, 0.3, 0.25, 0.15]),
        "avg_amount": rng.gamma(2.0, 900, n_fraud).clip(10, 50000),
        "is_fraud": 1,
    })

    df = pd.concat([legit, fraud], ignore_index=True)
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


def train_model(df: pd.DataFrame):
    X, y = df[FEATURES], df["is_fraud"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # class_weight handles imbalance without needing SMOTE for this demo.
    model = RandomForestClassifier(
        n_estimators=200, max_depth=12,
        class_weight="balanced", n_jobs=-1, random_state=42,
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)

    print("\n=== Evaluation (recall on fraud matters most) ===")
    print(classification_report(y_test, preds, digits=3))
    auc = roc_auc_score(y_test, proba)
    print(f"ROC-AUC: {auc:.3f}\n")

    importances = dict(zip(FEATURES, model.feature_importances_.round(4).tolist()))
    return model, {"roc_auc": round(float(auc), 4), "importances": importances}


def main():
    os.makedirs(SAVE_DIR, exist_ok=True)
    df = generate_synthetic_data()
    print(f"Generated {len(df)} transactions ({df.is_fraud.mean()*100:.1f}% fraud)")

    model, metrics = train_model(df)

    joblib.dump(model, os.path.join(SAVE_DIR, "model.pkl"))
    meta = {"model_version": MODEL_VERSION, "features": FEATURES, "metrics": metrics}
    with open(os.path.join(SAVE_DIR, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved model -> {os.path.join(SAVE_DIR, 'model.pkl')}")
    print("Feature importances:", json.dumps(metrics["importances"], indent=2))


if __name__ == "__main__":
    main()
