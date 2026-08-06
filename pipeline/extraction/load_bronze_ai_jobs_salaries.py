import json
from datetime import date
import psycopg2
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

conn = psycopg2.connect(
    host="portfolio_postgres",
    port=5432,
    dbname="portfolio",
    user="postgres",
    password="localdevpassword",
)
cur = conn.cursor()

with open("ai_jobs_salaries_raw_output.json") as f:
    rows = json.load(f)
snapshot_date = date.today().isoformat()
batch_loaded_at = datetime.now(timezone.utc)  # ONE shared timestamp for this whole batch, not per-row now()
rows_loaded = 0
for row in rows:
    cur.execute(
        "INSERT INTO bronze.ai_jobs_salaries_snapshot (raw_data, snapshot_date, loaded_at) VALUES (%s, %s, %s)",
        (json.dumps(row), snapshot_date, batch_loaded_at),
    )
    rows_loaded += 1

print(f"Loaded {rows_loaded} rows into bronze.ai_jobs_salaries_snapshot (snapshot_date={snapshot_date})")

conn.commit()
cur.close()
conn.close()
print("Done.")
