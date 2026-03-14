"""
Model Training Script — Example for training a demand prediction model.
Uses scikit-learn with synthetic data generation for demonstration.

In production, replace synthetic data with actual usage history from PostgreSQL.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import pickle
from datetime import datetime, timedelta
import os

# ─── Synthetic Data Generation ────────────────────────────────

def generate_synthetic_data(n_items: int = 50, n_days: int = 365) -> pd.DataFrame:
    """
    Generate synthetic inventory usage data for model training.
    Simulates realistic usage patterns with seasonality and trends.
    """
    data = []
    base_date = datetime.now() - timedelta(days=n_days)

    for item_id in range(n_items):
        # Each item has its own base usage pattern
        base_usage = np.random.uniform(1, 20)
        trend = np.random.uniform(-0.02, 0.05)  # slight upward/downward trend
        seasonality_amplitude = np.random.uniform(0, 5)

        for day in range(n_days):
            date = base_date + timedelta(days=day)

            # Base usage with trend
            usage = base_usage + trend * day

            # Weekly seasonality (lower on weekends)
            day_of_week = date.weekday()
            if day_of_week >= 5:  # Weekend
                usage *= 0.3

            # Monthly seasonality
            day_of_month = date.day
            usage += seasonality_amplitude * np.sin(2 * np.pi * day_of_month / 30)

            # Random noise
            usage += np.random.normal(0, base_usage * 0.2)

            # Ensure non-negative
            usage = max(0, int(round(usage)))

            data.append({
                "item_id": f"item_{item_id}",
                "date": date,
                "day_of_week": day_of_week,
                "day_of_month": day_of_month,
                "month": date.month,
                "week_of_year": date.isocalendar()[1],
                "is_weekend": 1 if day_of_week >= 5 else 0,
                "usage": usage,
            })

    return pd.DataFrame(data)


# ─── Feature Engineering ─────────────────────────────────────

def create_features(df: pd.DataFrame, lookback: int = 7) -> pd.DataFrame:
    """
    Create time-series features from usage data.
    Includes rolling averages, lag features, and temporal encodings.
    """
    df = df.sort_values(["item_id", "date"]).copy()

    for item_id in df["item_id"].unique():
        mask = df["item_id"] == item_id
        item_data = df.loc[mask, "usage"]

        # Rolling statistics
        df.loc[mask, "rolling_mean_7d"] = item_data.rolling(7, min_periods=1).mean()
        df.loc[mask, "rolling_std_7d"] = item_data.rolling(7, min_periods=1).std().fillna(0)
        df.loc[mask, "rolling_mean_30d"] = item_data.rolling(30, min_periods=1).mean()

        # Lag features
        df.loc[mask, "lag_1"] = item_data.shift(1).fillna(0)
        df.loc[mask, "lag_7"] = item_data.shift(7).fillna(0)
        df.loc[mask, "lag_14"] = item_data.shift(14).fillna(0)

        # Exponential moving average
        df.loc[mask, "ema_7d"] = item_data.ewm(span=7, min_periods=1).mean()

    return df


# ─── Model Training ──────────────────────────────────────────

def train_demand_model():
    """
    Train a demand prediction model using Random Forest and Gradient Boosting.
    Saves the best model as a pickle file.
    """
    print("📊 Generating synthetic training data...")
    df = generate_synthetic_data(n_items=50, n_days=365)

    print("🔧 Engineering features...")
    df = create_features(df)

    # Drop rows with NaN from rolling calculations
    df = df.dropna()

    # Feature columns
    feature_cols = [
        "day_of_week", "day_of_month", "month", "week_of_year", "is_weekend",
        "rolling_mean_7d", "rolling_std_7d", "rolling_mean_30d",
        "lag_1", "lag_7", "lag_14", "ema_7d",
    ]

    X = df[feature_cols].values
    y = df["usage"].values

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train multiple models
    models = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(
            n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42
        ),
    }

    best_model = None
    best_mae = float("inf")
    best_name = ""

    print("\n📈 Training models...\n")
    for name, model in models.items():
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        print(f"  {name}:")
        print(f"    MAE:  {mae:.4f}")
        print(f"    RMSE: {rmse:.4f}")
        print(f"    R²:   {r2:.4f}")
        print()

        if mae < best_mae:
            best_mae = mae
            best_model = model
            best_name = name

    print(f"✅ Best model: {best_name} (MAE: {best_mae:.4f})")

    # Save model and scaler
    os.makedirs("models", exist_ok=True)
    with open("models/demand_model.pkl", "wb") as f:
        pickle.dump({"model": best_model, "scaler": scaler, "features": feature_cols}, f)
    print("💾 Model saved to models/demand_model.pkl")

    # Feature importance (for tree-based models)
    if hasattr(best_model, "feature_importances_"):
        print("\n📊 Feature Importance:")
        importances = sorted(
            zip(feature_cols, best_model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
        for feat, imp in importances:
            print(f"  {feat}: {imp:.4f}")

    return best_model, scaler


if __name__ == "__main__":
    train_demand_model()
