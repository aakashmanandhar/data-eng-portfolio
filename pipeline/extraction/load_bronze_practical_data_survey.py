import csv
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

with open("survey_2026_data_engineering.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    records = [
        {k: (v.strip() if v else None) for k, v in row.items()}
        for row in reader
    ]

cur.execute("TRUNCATE TABLE bronze.practical_data_survey_2026")

rows = [(json.dumps(rec),) for rec in records]
execute_values(
    cur,
    "INSERT INTO bronze.practical_data_survey_2026 (raw_data) VALUES %s",
    rows,
)

conn.commit()
print(f"Loaded {len(rows)} rows into bronze.practical_data_survey_2026")
cur.close()
conn.close()