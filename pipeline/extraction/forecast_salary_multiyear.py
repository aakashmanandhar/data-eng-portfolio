import psycopg2
import psycopg2.extras
import numpy as np

MIN_YEARS_REQUIRED = 4
FORECAST_YEARS_AHEAD = 3  # honest horizon given only 6 real years of history

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT work_year, experience_level, median_salary_usd
    FROM dbt_dev_gold.fact_salary_by_experience
    ORDER BY experience_level, work_year
""")
rows = cur.fetchall()
cur.close()
conn.close()

by_level = {}
for r in rows:
    by_level.setdefault(r["experience_level"], []).append((r["work_year"], float(r["median_salary_usd"])))

results = []
for level, points in by_level.items():
    n = len(points)
    if n < MIN_YEARS_REQUIRED:
        results.append({"experience_level": level, "status": "insufficient_data",
                         "years_of_history": n, "years_required": MIN_YEARS_REQUIRED, "forecasts": []})
        continue

    years = np.array([p[0] for p in points], dtype=float)
    salaries = np.array([p[1] for p in points], dtype=float)
    x_mean = years.mean()
    sxx = np.sum((years - x_mean) ** 2)

    # manual OLS (avoids pulling in statsmodels just for this)
    slope = np.sum((years - x_mean) * (salaries - salaries.mean())) / sxx
    intercept = salaries.mean() - slope * x_mean
    predicted = intercept + slope * years
    residuals = salaries - predicted
    dof = n - 2
    residual_se = np.sqrt(np.sum(residuals ** 2) / dof) if dof > 0 else 0

    last_year = int(years.max())
    forecasts = []
    for i in range(1, FORECAST_YEARS_AHEAD + 1):
        future_year = last_year + i
        point_pred = intercept + slope * future_year
        # standard prediction-interval formula for simple linear regression
        se_pred = residual_se * np.sqrt(1 + 1 / n + ((future_year - x_mean) ** 2) / sxx) if dof > 0 else 0
        forecasts.append({
            "year": future_year,
            "predicted_salary": round(float(point_pred), 2),
            "lower_bound": round(float(point_pred - 1.96 * se_pred), 2),
            "upper_bound": round(float(point_pred + 1.96 * se_pred), 2),
        })

    results.append({
        "experience_level": level, "status": "ok",
        "years_of_history": n, "years_required": MIN_YEARS_REQUIRED,
        "growth_rate_per_year": round(float(slope), 2),
        "forecasts": forecasts,
    })

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.salary_forecast_multiyear (
        experience_level TEXT NOT NULL,
        forecast_year INTEGER,
        status TEXT NOT NULL,
        years_of_history INTEGER NOT NULL,
        years_required INTEGER NOT NULL,
        growth_rate_per_year NUMERIC,
        predicted_salary NUMERIC,
        lower_bound NUMERIC,
        upper_bound NUMERIC,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE,
        PRIMARY KEY (experience_level, forecast_year)
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.salary_forecast_multiyear")
insert_rows = []
for r in results:
    if r["status"] != "ok":
        insert_rows.append((r["experience_level"], None, r["status"], r["years_of_history"], r["years_required"], None, None, None, None))
    else:
        for f in r["forecasts"]:
            insert_rows.append((r["experience_level"], f["year"], "ok", r["years_of_history"], r["years_required"],
                                 r["growth_rate_per_year"], f["predicted_salary"], f["lower_bound"], f["upper_bound"]))
psycopg2.extras.execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.salary_forecast_multiyear
       (experience_level, forecast_year, status, years_of_history, years_required,
        growth_rate_per_year, predicted_salary, lower_bound, upper_bound)
       VALUES %s""",
    insert_rows,
)
conn.commit()

for r in results:
    print(f"{r['experience_level']}: {r['status']}, {r.get('years_of_history')} years")
    for f in r.get("forecasts", []):
        print(f"  {f['year']}: ${f['predicted_salary']:,.0f} (${f['lower_bound']:,.0f}-${f['upper_bound']:,.0f})")
cur.close()
conn.close()