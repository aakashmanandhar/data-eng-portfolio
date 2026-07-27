import json
import psycopg2
import psycopg2.extras
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import date

MIN_DAYS_REQUIRED = 7  # below this, we report "not enough data" rather than a fake-confident forecast

conn = psycopg2.connect(
    host="portfolio_postgres",
    port=5432,
    dbname="portfolio",
    user="postgres",
    password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

cur.execute("""
    SELECT cohort, snapshot_date, total_stars
    FROM dbt_dev_gold.fact_ai_adoption_signal
    ORDER BY cohort, snapshot_date
""")
rows = cur.fetchall()
cur.close()
conn.close()

by_cohort = {}
for r in rows:
    by_cohort.setdefault(r["cohort"], []).append((r["snapshot_date"], r["total_stars"]))

result = {"generated_at": str(date.today()), "cohorts": {}}

for cohort, points in by_cohort.items():
    n_days = len(points)
    if n_days < MIN_DAYS_REQUIRED:
        result["cohorts"][cohort] = {
            "status": "insufficient_data",
            "days_of_history": n_days,
            "days_required": MIN_DAYS_REQUIRED,
            "message": f"Only {n_days} day(s) of history collected so far — need at least {MIN_DAYS_REQUIRED} for a reliable trend.",
        }
        continue

    dates = [p[0] for p in points]
    stars = [p[1] for p in points]
    x = np.array([(d - dates[0]).days for d in dates]).reshape(-1, 1)
    y = np.array(stars)

    model = LinearRegression()
    model.fit(x, y)
    slope = float(model.coef_[0])
    intercept = model.intercept_

    result["cohorts"][cohort] = {
        "status": "ok",
        "days_of_history": n_days,
        "daily_growth_rate": round(slope, 2),
        "current_stars": stars[-1],
        "r_squared": round(float(model.score(x, y)), 4),
    }

# If both cohorts have a real trend, compute the crossover point (if any)
ai = result["cohorts"].get("ai")
trad = result["cohorts"].get("traditional")
if ai and trad and ai["status"] == "ok" and trad["status"] == "ok":
    slope_diff = ai["daily_growth_rate"] - trad["daily_growth_rate"]
    if slope_diff != 0:
        # Solve for the day where projected values would be equal, from today
        days_to_crossover = (trad["current_stars"] - ai["current_stars"]) / slope_diff
        if days_to_crossover > 0:
            result["crossover_days_from_now"] = round(float(days_to_crossover), 1)
        else:
            result["crossover_days_from_now"] = None  # already crossed, or diverging
    else:
        result["crossover_days_from_now"] = None

with open("forecast_output.json", "w") as f:
    json.dump(result, f, indent=2)

# Persist into dbt_dev_gold.ai_adoption_forecast
conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()

crossover = result.get("crossover_days_from_now")

for cohort, data in result["cohorts"].items():
    cur.execute("""
        INSERT INTO dbt_dev_gold.ai_adoption_forecast
            (cohort, status, days_of_history, days_required, daily_growth_rate,
             current_stars, r_squared, message, crossover_days_from_now, generated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        cohort,
        data["status"],
        data.get("days_of_history"),
        data.get("days_required"),
        data.get("daily_growth_rate"),
        data.get("current_stars"),
        data.get("r_squared"),
        data.get("message"),
        crossover if data["status"] == "ok" else None,
        result["generated_at"],
    ))

conn.commit()
cur.close()
conn.close()

print(json.dumps(result, indent=2))
print("\nDone. Saved to forecast_output.json and dbt_dev_gold.ai_adoption_forecast")