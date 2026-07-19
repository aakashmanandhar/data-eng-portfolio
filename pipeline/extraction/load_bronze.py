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

cur.execute("TRUNCATE bronze.adzuna_job_market, bronze.so_survey_by_country, bronze.so_survey_preferred_global;")

# --- Load Adzuna data ---
with open("adzuna_raw_output.json") as f:
    adzuna_data = json.load(f)

adzuna_rows = 0
for country_code, levels in adzuna_data.items():
    for seniority_level, payload in levels.items():
        cur.execute(
            "INSERT INTO bronze.adzuna_job_market (country_code, seniority_level, raw_data) VALUES (%s, %s, %s)",
            (country_code, seniority_level, json.dumps(payload)),
        )
        adzuna_rows += 1

print(f"Loaded {adzuna_rows} rows into bronze.adzuna_job_market")

# --- Load SO Survey by-country data ---
with open("so_survey_extracted.json") as f:
    so_data = json.load(f)

so_country_rows = 0
for country, payload in so_data["by_country"].items():
    cur.execute(
        "INSERT INTO bronze.so_survey_by_country (country, raw_data) VALUES (%s, %s)",
        (country, json.dumps(payload)),
    )
    so_country_rows += 1

print(f"Loaded {so_country_rows} rows into bronze.so_survey_by_country")

# --- Load SO Survey global preferred tools ---
cur.execute(
    "INSERT INTO bronze.so_survey_preferred_global (raw_data) VALUES (%s)",
    (json.dumps(so_data["most_preferred_global"]),),
)
print("Loaded 1 row into bronze.so_survey_preferred_global")

conn.commit()
cur.close()
conn.close()
print("\nDone. All data committed to bronze schema.")