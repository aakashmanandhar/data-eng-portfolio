"""
Flags keywords whose mention count today spikes well above their own recent
baseline - a genuinely different question from the growth model: a keyword
can have a flat long-term trend but a real breakout today (a major release,
an outage, a new launch). Gated on real accumulated snapshot_date history,
same discipline as the growth model.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np

MIN_DAYS_REQUIRED = 4  # today + at least 3 prior days for a meaningful baseline
BREAKOUT_THRESHOLD = 2.0  # today's count must be at least 2x the recent baseline

conn = psycopg2.connect(
    host=os.environ.get("POSTGRES_HOST", "portfolio_postgres"),
    dbname=os.environ.get("POSTGRES_DB", "portfolio"),
    user=os.environ.get("POSTGRES_USER", "postgres"),
    password=os.environ.get("POSTGRES_PASSWORD", "localdevpassword"),
    port=os.environ.get("POSTGRES_PORT", "5432"),
)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.news_keyword_breakout (
        keyword_id INTEGER PRIMARY KEY,
        status TEXT NOT NULL,
        days_of_history INTEGER,
        today_mentions INTEGER,
        baseline_avg NUMERIC,
        is_breakout BOOLEAN,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")
conn.commit()

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

    history_sorted = sorted(history, key=lambda x: x[0])
    today_count = history_sorted[-1][1]
    baseline = history_sorted[:-1]
    baseline_avg = float(np.mean([d[1] for d in baseline]))
    is_breakout = baseline_avg > 0 and (today_count / baseline_avg) >= BREAKOUT_THRESHOLD
    results.append((keyword_id, "ok", days_of_history, today_count, baseline_avg, is_breakout))

for keyword_id, status, days, today, baseline, breakout in results:
    cur.execute("""
        INSERT INTO dbt_dev_gold.news_keyword_breakout
        (keyword_id, status, days_of_history, today_mentions, baseline_avg, is_breakout)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (keyword_id) DO UPDATE SET
            status = EXCLUDED.status, days_of_history = EXCLUDED.days_of_history,
            today_mentions = EXCLUDED.today_mentions, baseline_avg = EXCLUDED.baseline_avg,
            is_breakout = EXCLUDED.is_breakout, generated_at = now()
    """, (keyword_id, status, days, today, baseline, breakout))
conn.commit()

ok_count = sum(1 for r in results if r[1] == "ok")
print(f"Total keywords: {len(results)} | status=ok: {ok_count} | status=insufficient_data: {len(results) - ok_count}")
cur.close()
conn.close()