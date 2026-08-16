import json
import psycopg2

conn = psycopg2.connect(
    host="portfolio_postgres",
    port=5432,
    dbname="portfolio",
    user="postgres",
    password="localdevpassword",
)
cur = conn.cursor()

with open("pypi_trends_output.json") as f:
    packages = json.load(f)

rows_loaded = 0
for pkg in packages:
    cur.execute(
        """
        INSERT INTO bronze.pypi_trends (tool_name, raw_data)
        VALUES (%s, %s)
        ON CONFLICT (tool_name, snapshot_date) DO UPDATE SET raw_data = EXCLUDED.raw_data
        """,
        (pkg["tool_name"], json.dumps(pkg)),
    )
    rows_loaded += 1

conn.commit()
cur.close()
conn.close()
print(f"Loaded/updated {rows_loaded} rows into bronze.pypi_trends")
