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

with open("crossref_output.json") as f:
    papers = json.load(f)

rows_loaded = 0
for paper in papers:
    cur.execute(
        """
        INSERT INTO bronze.crossref_papers (external_id, raw_data)
        VALUES (%s, %s)
        ON CONFLICT (external_id) DO UPDATE SET raw_data = EXCLUDED.raw_data
        """,
        (paper["external_id"], json.dumps(paper)),
    )
    rows_loaded += 1

conn.commit()
cur.close()
conn.close()
print(f"Loaded/updated {rows_loaded} rows into bronze.crossref_papers")
