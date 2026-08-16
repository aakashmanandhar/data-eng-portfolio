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

with open("research_repos_output.json") as f:
    repos = json.load(f)

rows_loaded = 0
for repo in repos:
    cur.execute(
        """
        INSERT INTO bronze.research_repos (external_id, raw_data)
        VALUES (%s, %s)
        ON CONFLICT (external_id) DO UPDATE SET raw_data = EXCLUDED.raw_data
        """,
        (repo["external_id"], json.dumps(repo)),
    )
    rows_loaded += 1

conn.commit()
cur.close()
conn.close()
print(f"Loaded/updated {rows_loaded} rows into bronze.research_repos")
