import psycopg2
import psycopg2.extras
import numpy as np
from datetime import date

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT repo_full_name, cohort, snapshot_date, stars, star_growth
    FROM dbt_dev_gold.fact_github_repo_trend
    ORDER BY repo_full_name, snapshot_date
""")
rows = cur.fetchall()
cur.close()
conn.close()

by_repo = {}
for r in rows:
    by_repo.setdefault(r["repo_full_name"], []).append(r)

MIN_DAYS_REQUIRED = 10  # need enough points to split into two meaningful halves

# Median total stars across all tracked repos - the size threshold separating
# "emerging" (small) from "established" (accelerating/mature/declining)
latest_stars = [points[-1]["stars"] for points in by_repo.values() if len(points) >= MIN_DAYS_REQUIRED]
median_stars = float(np.median(latest_stars)) if latest_stars else 0

results = []
for repo, points in by_repo.items():
    n_days = len(points)
    cohort = points[0]["cohort"]
    latest_stars_val = points[-1]["stars"]
    if n_days < MIN_DAYS_REQUIRED:
        results.append({
            "repo_full_name": repo, "cohort": cohort, "status": "insufficient_data",
            "days_of_history": n_days, "days_required": MIN_DAYS_REQUIRED, "stage": None,
        })
        continue

    growths = [p["star_growth"] for p in points if p["star_growth"] is not None]
    if len(growths) < MIN_DAYS_REQUIRED - 1:
        results.append({
            "repo_full_name": repo, "cohort": cohort, "status": "insufficient_data",
            "days_of_history": n_days, "days_required": MIN_DAYS_REQUIRED, "stage": None,
        })
        continue

    mid = len(growths) // 2
    first_half_avg = float(np.mean(growths[:mid]))
    second_half_avg = float(np.mean(growths[mid:]))
    overall_avg = float(np.mean(growths))
    is_established = latest_stars_val >= median_stars

    if overall_avg <= 0:
        stage = "Declining"
    elif not is_established:
        stage = "Emerging"
    elif second_half_avg > first_half_avg * 1.15:
        stage = "Accelerating"
    else:
        stage = "Mature"

    results.append({
        "repo_full_name": repo, "cohort": cohort, "status": "ok",
        "days_of_history": n_days, "days_required": MIN_DAYS_REQUIRED, "stage": stage,
        "avg_daily_growth": round(overall_avg, 2),
        "first_half_avg_growth": round(first_half_avg, 2),
        "second_half_avg_growth": round(second_half_avg, 2),
        "current_stars": latest_stars_val,
    })

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.tool_momentum_stage (
        repo_full_name TEXT PRIMARY KEY,
        cohort TEXT,
        status TEXT NOT NULL,
        days_of_history INTEGER NOT NULL,
        days_required INTEGER NOT NULL,
        stage TEXT,
        avg_daily_growth NUMERIC,
        first_half_avg_growth NUMERIC,
        second_half_avg_growth NUMERIC,
        current_stars INTEGER,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.tool_momentum_stage")
psycopg2.extras.execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.tool_momentum_stage
       (repo_full_name, cohort, status, days_of_history, days_required, stage,
        avg_daily_growth, first_half_avg_growth, second_half_avg_growth, current_stars)
       VALUES %s""",
    [(r["repo_full_name"], r["cohort"], r["status"], r["days_of_history"], r["days_required"],
      r.get("stage"), r.get("avg_daily_growth"), r.get("first_half_avg_growth"),
      r.get("second_half_avg_growth"), r.get("current_stars")) for r in results],
)
conn.commit()

ok_results = [r for r in results if r["status"] == "ok"]
print(f"Total repos: {len(results)}")
print(f"  status=ok: {len(ok_results)}")
print(f"  status=insufficient_data: {len(results) - len(ok_results)}")
from collections import Counter
print(f"  Stage breakdown: {dict(Counter(r['stage'] for r in ok_results))}")
cur.close()
conn.close()