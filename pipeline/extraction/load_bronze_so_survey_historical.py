import os
import json
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(
    host="portfolio_postgres",
    port=5432,
    dbname="portfolio",
    user="postgres",
    password="localdevpassword",
)
cur = conn.cursor()

with open("so_survey_historical_extracted.json") as f:
    records = json.load(f)

# Idempotent re-runs: this loader may run more than once during development
# (e.g. re-running after a mapping fix) - truncate first so we don't silently
# double-count respondents on a second run, matching the pattern already
# established for other re-runnable loaders in this project.
cur.execute("TRUNCATE TABLE bronze.so_survey_historical")

# Batch insert via execute_values instead of one INSERT per row - at 720K+
# records, a naive per-row loop (like the smaller arxiv/hackernews loaders use)
# would take far too long; this sends rows in large batches per round-trip.
rows = [(rec["year"], json.dumps(rec)) for rec in records]

BATCH_SIZE = 5000
rows_loaded = 0
for i in range(0, len(rows), BATCH_SIZE):
    batch = rows[i : i + BATCH_SIZE]
    execute_values(
        cur,
        "INSERT INTO bronze.so_survey_historical (survey_year, raw_data) VALUES %s",
        batch,
    )
    rows_loaded += len(batch)
    print(f"  loaded {rows_loaded}/{len(rows)} rows...")

conn.commit()
print(f"Loaded {rows_loaded} rows into bronze.so_survey_historical")
cur.close()
conn.close()
print("Done.")