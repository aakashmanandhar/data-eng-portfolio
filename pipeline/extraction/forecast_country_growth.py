import json
import psycopg2
import psycopg2.extras
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import date

MIN_DAYS_REQUIRED = 7  # same honest gate as the global AI Adoption Forecast

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT country_code, snapshot_date, ai_share_pct, total_stargazers
    FROM dbt_dev_gold.fact_country_ai_signal
    ORDER BY country_code, snapshot_date
""")
rows = cur.fetchall()
cur.close()
conn.close()

by_country = {}
for r in rows:
    by_country.setdefault(r["country_code"], []).append(
        (r["snapshot_date"], float(r["ai_share_pct"]), r["total_stargazers"])
    )

results = []
for country, points in by_country.items():
    n_days = len(points)
    if n_days < MIN_DAYS_REQUIRED:
        results.append({
            "country_code": country, "status": "insufficient_data",
            "days_of_history": n_days, "days_required": MIN_DAYS_REQUIRED,
            "growth_rate_per_day": None, "current_ai_share_pct": None,
            "predicted_ai_share_pct_30d": None, "r_squared": None,
        })
        continue
    dates = [p[0] for p in points]
    shares = [p[1] for p in points]
    x = np.array([(d - dates[0]).days for d in dates]).reshape(-1, 1)
    y = np.array(shares)
    model = LinearRegression()
    model.fit(x, y)
    slope = float(model.coef_[0])
    current_share = shares[-1]
    predicted_30d = max(0.0, min(1.0, current_share + slope * 30))
    results.append({
        "country_code": country, "status": "ok",
        "days_of_history": n_days, "days_required": MIN_DAYS_REQUIRED,
        "growth_rate_per_day": round(slope, 6), "current_ai_share_pct": round(current_share, 4),
        "predicted_ai_share_pct_30d": round(predicted_30d, 4), "r_squared": round(float(model.score(x, y)), 4),
    })

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.country_growth_forecast (
        country_code TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        days_of_history INTEGER NOT NULL,
        days_required INTEGER NOT NULL,
        growth_rate_per_day NUMERIC,
        current_ai_share_pct NUMERIC,
        predicted_ai_share_pct_30d NUMERIC,
        r_squared NUMERIC,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.country_growth_forecast")
psycopg2.extras.execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.country_growth_forecast
       (country_code, status, days_of_history, days_required, growth_rate_per_day,
        current_ai_share_pct, predicted_ai_share_pct_30d, r_squared)
       VALUES %s""",
    [(r["country_code"], r["status"], r["days_of_history"], r["days_required"],
      r["growth_rate_per_day"], r["current_ai_share_pct"], r["predicted_ai_share_pct_30d"], r["r_squared"])
     for r in results],
)
conn.commit()

ok_count = sum(1 for r in results if r["status"] == "ok")
print(f"Total countries: {len(results)}")
print(f"  status=ok: {ok_count}")
print(f"  status=insufficient_data: {len(results) - ok_count}")
cur.close()
conn.close()