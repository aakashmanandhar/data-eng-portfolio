import psycopg2
import psycopg2.extras
import numpy as np
from sklearn.linear_model import LinearRegression

MIN_YEARS_REQUIRED = 4  # matches the SO Survey forecast's own established yearly-data threshold

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT canonical_tool, work_year, SUM(respondent_count) AS respondent_count,
           SUM(avg_salary_usd * respondent_count) / NULLIF(SUM(respondent_count), 0) AS weighted_avg_salary
    FROM dbt_dev_gold.fact_salary_by_tool
    GROUP BY canonical_tool, work_year
    ORDER BY canonical_tool, work_year
""")
rows = cur.fetchall()
cur.close()
conn.close()

by_tool = {}
for r in rows:
    by_tool.setdefault(r["canonical_tool"], []).append((r["work_year"], float(r["weighted_avg_salary"])))

results = []
for tool, points in by_tool.items():
    n_years = len(points)
    if n_years < MIN_YEARS_REQUIRED:
        results.append({
            "canonical_tool": tool, "status": "insufficient_data",
            "years_of_history": n_years, "years_required": MIN_YEARS_REQUIRED,
            "growth_rate_per_year": None, "latest_salary": None, "r_squared": None,
        })
        continue
    years = [p[0] for p in points]
    salaries = [p[1] for p in points]
    x = np.array([(y - years[0]) for y in years]).reshape(-1, 1)
    y = np.array(salaries)
    model = LinearRegression()
    model.fit(x, y)
    slope = float(model.coef_[0])
    results.append({
        "canonical_tool": tool, "status": "ok",
        "years_of_history": n_years, "years_required": MIN_YEARS_REQUIRED,
        "growth_rate_per_year": round(slope, 2), "latest_salary": round(salaries[-1], 2),
        "r_squared": round(float(model.score(x, y)), 4),
    })

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.skill_salary_growth (
        canonical_tool TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        years_of_history INTEGER NOT NULL,
        years_required INTEGER NOT NULL,
        growth_rate_per_year NUMERIC,
        latest_salary NUMERIC,
        r_squared NUMERIC,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.skill_salary_growth")
psycopg2.extras.execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.skill_salary_growth
       (canonical_tool, status, years_of_history, years_required, growth_rate_per_year, latest_salary, r_squared)
       VALUES %s""",
    [(r["canonical_tool"], r["status"], r["years_of_history"], r["years_required"],
      r["growth_rate_per_year"], r["latest_salary"], r["r_squared"]) for r in results],
)
conn.commit()

ok_count = sum(1 for r in results if r["status"] == "ok")
print(f"Total tools: {len(results)}")
print(f"  status=ok: {ok_count}")
print(f"  status=insufficient_data: {len(results) - ok_count}")
cur.close()
conn.close()