"""
[SO-HIST] Forecasts each DE tool's usage_pct trend over the 10 years of
harmonized SO Survey data, both overall (all countries combined) and
per-country. Fits scikit-learn LinearRegression on (survey_year, usage_pct)
per (scope, tool) group. Honest data-sufficiency gate: below MIN_YEARS
distinct years of history, writes status='insufficient_data' rather than
fitting a regression to too few points.
"""
import os
import psycopg2
from psycopg2.extras import execute_values
from sklearn.linear_model import LinearRegression
import numpy as np

MIN_YEARS = 4

conn = psycopg2.connect(
    host="portfolio_postgres",
    port=5432,
    dbname="portfolio",
    user="postgres",
    password="localdevpassword",
)
cur = conn.cursor()


def fit_and_predict(years, usage_pcts):
    X = np.array(years).reshape(-1, 1)
    y = np.array(usage_pcts)
    model = LinearRegression()
    model.fit(X, y)
    r_squared = model.score(X, y)
    next_year = max(years) + 1
    predicted = model.predict([[next_year]])[0]
    # Clamp prediction to a sane [0, 1] range - a naive linear extrapolation
    # can otherwise predict impossible values like negative usage or >100%.
    predicted = max(0.0, min(1.0, float(predicted)))
    return float(model.coef_[0]), float(r_squared), predicted


def process_scope(scope_label, group_query):
    cur.execute(group_query)
    rows = cur.fetchall()

    # Group by (country_or_null, tool_category, canonical_tool)
    groups = {}
    for country, tool_category, canonical_tool, survey_year, usage_pct in rows:
        key = (country, tool_category, canonical_tool)
        groups.setdefault(key, []).append((survey_year, float(usage_pct)))

    results = []
    for (country, tool_category, canonical_tool), points in groups.items():
        years_of_history = len(points)
        if years_of_history < MIN_YEARS:
            results.append((
                scope_label, country, tool_category, canonical_tool,
                years_of_history, "insufficient_data", None, None, None,
            ))
            continue

        years = [p[0] for p in points]
        usage_pcts = [p[1] for p in points]
        growth_rate, r_squared, predicted = fit_and_predict(years, usage_pcts)
        results.append((
            scope_label, country, tool_category, canonical_tool,
            years_of_history, "ok", growth_rate, r_squared, predicted,
        ))
    return results


overall_query = """
    SELECT NULL AS country, tool_category, canonical_tool, survey_year, usage_pct
    FROM (
        SELECT
            tool_category, canonical_tool, survey_year,
            SUM(respondent_count)::numeric / NULLIF(SUM(total_respondents), 0) AS usage_pct
        FROM dbt_dev_gold.fact_de_tool_by_country_year
        GROUP BY tool_category, canonical_tool, survey_year
    ) sub
"""

country_query = """
    SELECT country, tool_category, canonical_tool, survey_year, usage_pct
    FROM dbt_dev_gold.fact_de_tool_by_country_year
"""

all_results = []
all_results.extend(process_scope("overall", overall_query))
all_results.extend(process_scope("country", country_query))

cur.execute("TRUNCATE TABLE dbt_dev_gold.de_tool_forecast")
execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.de_tool_forecast
       (scope, country, tool_category, canonical_tool, years_of_history,
        status, growth_rate_per_year, r_squared, predicted_next_year_usage_pct)
       VALUES %s""",
    all_results,
)
conn.commit()

ok_count = sum(1 for r in all_results if r[5] == "ok")
insufficient_count = sum(1 for r in all_results if r[5] == "insufficient_data")
print(f"Total forecasts: {len(all_results)}")
print(f"  status=ok: {ok_count}")
print(f"  status=insufficient_data: {insufficient_count}")

cur.close()
conn.close()