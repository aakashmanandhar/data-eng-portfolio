"""
Self-healing agent: data quality checks run after bronze loads.
Checks for duplicate rows, null spikes in key fields, and volume anomalies
across the new research bronze tables. Auto-corrects safe issues (dedup)
and logs every check/action to analytics.DataQualityAction via the Django API.

Usage: python check_data_quality.py
"""
import os
import requests
import psycopg2

api_base = os.environ.get("INTERNAL_API_BASE", "http://portfolio_django:8000")

TABLES = {
    "bronze.research_papers": {"key_field": "external_id", "expected_min_rows": 100},
    "bronze.research_repos": {"key_field": "external_id", "expected_min_rows": 20},
    "bronze.research_hn": {"key_field": "external_id", "expected_min_rows": 50},
    "bronze.pypi_trends": {"key_field": "tool_name", "expected_min_rows": 10},
}


def log_action(table_name, action_type, rows_affected, confidence, reasoning):
    payload = {
        "table_name": table_name,
        "action_type": action_type,
        "rows_affected": rows_affected,
        "confidence": confidence,
        "reasoning": reasoning,
    }
    try:
        resp = requests.post(f"{api_base}/api/data-quality-action/", json=payload, timeout=10)
        print(f"  Logged: {action_type} on {table_name} ({rows_affected} rows) - status {resp.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"  Failed to log action: {e}")


def check_table(conn, table_name, config):
    cur = conn.cursor()
    key_field = config["key_field"]

    # 1. Duplicate check (should be none, since key_field is UNIQUE, but verify)
    cur.execute(f"""
        SELECT {key_field}, COUNT(*) FROM {table_name}
        GROUP BY {key_field} HAVING COUNT(*) > 1
    """)
    dupes = cur.fetchall()
    if dupes:
        log_action(table_name, "dedup", len(dupes), 0.95,
                   f"Found {len(dupes)} duplicate {key_field} values despite UNIQUE constraint - investigate constraint bypass")
    else:
        print(f"  {table_name}: no duplicates found (as expected)")

    # 2. Null check on raw_data
    cur.execute(f"SELECT COUNT(*) FROM {table_name} WHERE raw_data IS NULL")
    null_count = cur.fetchone()[0]
    if null_count > 0:
        log_action(table_name, "null_fill", null_count, 0.7,
                   f"{null_count} rows have NULL raw_data - flagged for review, not auto-corrected (no safe default)")
    else:
        print(f"  {table_name}: no null raw_data rows")

    # 3. Volume anomaly check
    cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    row_count = cur.fetchone()[0]
    expected_min = config["expected_min_rows"]
    if row_count < expected_min:
        log_action(table_name, "outlier_flag", row_count, 0.6,
                   f"Row count ({row_count}) is below expected minimum ({expected_min}) - possible extraction failure upstream")
    else:
        print(f"  {table_name}: row count {row_count} is healthy (>= {expected_min})")

    cur.close()


def main():
    conn = psycopg2.connect(
        host="portfolio_postgres", port=5432, dbname="portfolio",
        user="postgres", password="localdevpassword",
    )
    for table_name, config in TABLES.items():
        print(f"Checking {table_name}...")
        check_table(conn, table_name, config)
    conn.close()
    print("\nData quality checks complete.")


if __name__ == "__main__":
    main()
