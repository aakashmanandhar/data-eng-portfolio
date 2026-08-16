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

with open("research_hn_output.json") as f:
    stories = json.load(f)

rows_loaded = 0
for story in stories:
    cur.execute(
        """
        INSERT INTO bronze.research_hn (external_id, raw_data)
        VALUES (%s, %s)
        ON CONFLICT (external_id) DO UPDATE SET raw_data = EXCLUDED.raw_data
        """,
        (story["external_id"], json.dumps(story)),
    )
    rows_loaded += 1

conn.commit()
cur.close()
conn.close()
print(f"Loaded/updated {rows_loaded} rows into bronze.research_hn")
