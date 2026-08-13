"""
Per-keyword mention-count growth forecast, gated on real accumulated
snapshot_date history from our own daily pipeline runs (not article
publish dates). Deliberately short thresholds and horizon compared to
the salary pipeline's multi-year models - news topic churn moves in
days, not years, so projecting far out would be dishonest.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.linear_model import LinearRegression
import numpy as np

MIN_DAYS_REQUIRED = 5  # short, honest threshold matched to news' real daily cadence
FORECAST_DAYS_AHEAD = 7  # days, not years - news trends don't hold a straight line for long

conn = psycopg2.connect(
    host=os.environ.get("POSTGRES_HOST", "portfolio_postgres"),
    dbname=os.environ.get("POSTGRES_DB", "portfolio"),
    user=os.environ.get("POSTGRES_USER", "postgres"),
    password=os.environ.get("POSTGRES_PASSWORD", "localdevpassword"),
    port=os.environ.get("POSTGRES_PORT", "5432"),
)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.news_keyword_growth (
        keyword_id INTEGER PRIMARY KEY,
        status TEXT NOT NULL,
        days_of_history INTEGER,
        growth_rate_per_day NUMERIC,
        r_squared NUMERIC,
        predicted_mentions_7d NUMERIC,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")
conn.commit()

# Real accumulated pipeline-run days per keyword, from bronze's own snapshot_date
cur.execute("""
    SELECT
        dk.keyword_id,
        b.snapshot_date,
        count(*) as daily_mentions
    FROM bronze.news_articles_snapshot b
    JOIN dbt_dev_gold.dim_keyword dk ON b.raw_data->>'_matched_keyword' = dk.keyword
    GROUP BY dk.keyword_id, b.snapshot_date
    ORDER BY dk.keyword_id, b.snapshot_date
""")
rows = cur.fetchall()

by_keyword = {}
for r in rows:
    by_keyword.setdefault(r["keyword_id"], []).append((r["snapshot_date"], r["daily_mentions"]))

results = []
for keyword_id, history in by_keyword.items():
    days_of_history = len(history)
    if days_of_history < MIN_DAYS_REQUIRED:
        results.append((keyword_id, "insufficient_data", days_of_history, None, None, None))
        continue

    X = np.array([(d[0] - history[0][0]).days for d in history]).reshape(-1, 1)
    y = np.array([d[1] for d in history])
    model = LinearRegression().fit(X, y)
    r_squared = float(model.score(X, y))
    growth_rate = float(model.coef_[0])
    predicted = float(model.predict([[X[-1][0] + FORECAST_DAYS_AHEAD]])[0])
    results.append((keyword_id, "ok", days_of_history, growth_rate, r_squared, max(0, predicted)))

for keyword_id, status, days, rate, r2, pred in results:
    cur.execute("""
        INSERT INTO dbt_dev_gold.news_keyword_growth
        (keyword_id, status, days_of_history, growth_rate_per_day, r_squared, predicted_mentions_7d)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (keyword_id) DO UPDATE SET
            status = EXCLUDED.status, days_of_history = EXCLUDED.days_of_history,
            growth_rate_per_day = EXCLUDED.growth_rate_per_day, r_squared = EXCLUDED.r_squared,
            predicted_mentions_7d = EXCLUDED.predicted_mentions_7d, generated_at = now()
    """, (keyword_id, status, days, rate, r2, pred))
conn.commit()

ok_count = sum(1 for r in results if r[1] == "ok")
print(f"Total keywords: {len(results)} | status=ok: {ok_count} | status=insufficient_data: {len(results) - ok_count}")
cur.close()
conn.close()