import json
import psycopg2
from datetime import date

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()

with open("oss_insight_output.json") as f:
    oss_data = json.load(f)

rows_loaded = 0
skipped = 0
for repo, payload in oss_data.items():
    if payload["status"] != 200 or not payload["data"]:
        skipped += 1
        continue
    cur.execute(
        "INSERT INTO bronze.oss_insight_stargazers (repo_full_name, raw_data, snapshot_date) VALUES (%s, %s, %s)",
        (repo, json.dumps(payload), date.today()),
    )
    rows_loaded += 1

print(f"Loaded {rows_loaded} rows into bronze.oss_insight_stargazers")
print(f"Skipped {skipped} repos (failed status or no data)")

conn.commit()
cur.close()
conn.close()
print("Done.")