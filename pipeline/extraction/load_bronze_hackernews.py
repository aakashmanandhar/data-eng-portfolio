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

with open("hackernews_output.json") as f:
    hn_data = json.load(f)

rows_loaded = 0
for cohort, payload in hn_data.items():
    cur.execute(
        "INSERT INTO bronze.hackernews_snapshot (cohort, raw_data) VALUES (%s, %s)",
        (cohort, json.dumps(payload)),
    )
    rows_loaded += 1

print(f"Loaded {rows_loaded} rows into bronze.hackernews_snapshot")

conn.commit()
cur.close()
conn.close()
print("Done.")