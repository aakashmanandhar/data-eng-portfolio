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

with open("github_org_output.json") as f:
    org_data = json.load(f)

rows_loaded = 0
for org_name, payload in org_data.items():
    cur.execute(
        "INSERT INTO bronze.github_org_snapshot (org_name, raw_data) VALUES (%s, %s)",
        (org_name, json.dumps(payload)),
    )
    rows_loaded += 1

print(f"Loaded {rows_loaded} rows into bronze.github_org_snapshot")

conn.commit()
cur.close()
conn.close()
print("Done.")