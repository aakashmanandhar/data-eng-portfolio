import os
import json
import psycopg2
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

with open("github_raw_output.json") as f:
    github_data = json.load(f)

rows_loaded = 0
for repo_full_name, payload in github_data.items():
    cur.execute(
        "INSERT INTO bronze.github_repo_snapshot (repo_full_name, cohort, raw_data) VALUES (%s, %s, %s)",
        (repo_full_name, payload.get("cohort", "unknown"), json.dumps(payload)),
    )
    rows_loaded += 1

print(f"Loaded {rows_loaded} rows into bronze.github_repo_snapshot")

conn.commit()
cur.close()
conn.close()
print("Done.")