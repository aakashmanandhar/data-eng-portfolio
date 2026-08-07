import psycopg2
import psycopg2.extras
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

EXPERIENCE_MAP = {"EN": 0, "MI": 1, "SE": 2, "EX": 3}
SIZE_MAP = {"S": 0, "M": 1, "L": 2}

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT experience_level, remote_ratio, company_size, job_title, salary_in_usd
    FROM dbt_dev_silver.silver_ai_jobs_salaries
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM dbt_dev_silver.silver_ai_jobs_salaries)
""")
rows = cur.fetchall()
cur.close()
conn.close()

distinct_titles = sorted(set(r["job_title"] for r in rows))
TITLE_MAP = {t: i for i, t in enumerate(distinct_titles)}
joblib.dump(TITLE_MAP, "/app/analytics/ml_models/title_map.joblib")  # saved so the API encodes new inputs identically

X = np.array([[EXPERIENCE_MAP[r["experience_level"]], r["remote_ratio"], SIZE_MAP[r["company_size"]], TITLE_MAP[r["job_title"]]] for r in rows])
y = np.array([float(r["salary_in_usd"]) for r in rows])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)

print(f"Trained on {len(X_train)} rows, tested on {len(X_test)} rows")
print(f"R² on held-out test set: {r2:.4f}")
print(f"MAE on held-out test set: ${mae:,.0f}")
print(f"Feature importances: experience_level={model.feature_importances_[0]:.3f}, remote_ratio={model.feature_importances_[1]:.3f}, company_size={model.feature_importances_[2]:.3f}, job_title={model.feature_importances_[3]:.3f}")
print(f"Number of distinct job titles used: {len(distinct_titles)}")

os.makedirs("/app/analytics/ml_models", exist_ok=True)
joblib.dump(model, "/app/analytics/ml_models/salary_predictor.joblib")
print("Saved model to /app/analytics/ml_models/salary_predictor.joblib")

# Persist the real accuracy metrics so the API can honestly report them alongside predictions
conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.salary_predictor_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        r_squared NUMERIC,
        mae_usd NUMERIC,
        trained_on_rows INTEGER,
        tested_on_rows INTEGER,
        trained_at DATE NOT NULL DEFAULT CURRENT_DATE,
        CONSTRAINT single_row CHECK (id = 1)
    )
""")
cur.execute("""
    INSERT INTO dbt_dev_gold.salary_predictor_metadata (id, r_squared, mae_usd, trained_on_rows, tested_on_rows)
    VALUES (1, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET r_squared = %s, mae_usd = %s, trained_on_rows = %s, tested_on_rows = %s, trained_at = CURRENT_DATE
""", (r2, mae, len(X_train), len(X_test), r2, mae, len(X_train), len(X_test)))
conn.commit()
cur.close()
conn.close()