"""
Loads extracted DE/AI-DE news articles into bronze.news_articles_snapshot.
Uses ONE shared batch timestamp before the row loop (not per-row defaults) -
this is the exact fix already learned from the salary pipeline's real
double-counting bug: per-row INSERT-time defaults make same-day re-runs
undetectable and undeduplicatable. This makes loaded_at a genuine, reusable
batch identifier from day one, not a lesson to relearn here.
"""
import os
import json
import psycopg2
from psycopg2.extras import Json
from datetime import datetime, timezone

conn = psycopg2.connect(
    host=os.environ.get("POSTGRES_HOST", "portfolio_postgres"),
    dbname=os.environ.get("POSTGRES_DB", "portfolio"),
    user=os.environ.get("POSTGRES_USER", "postgres"),
    password=os.environ.get("POSTGRES_PASSWORD", "localdevpassword"),
    port=os.environ.get("POSTGRES_PORT", "5432"),
)
cur = conn.cursor()

with open("de_ai_news_raw_output.json") as f:
    articles = json.load(f)

batch_loaded_at = datetime.now(timezone.utc)  # ONE shared timestamp for this whole batch

for article in articles:
    cur.execute(
        "INSERT INTO bronze.news_articles_snapshot (raw_data, loaded_at) VALUES (%s, %s)",
        (Json(article), batch_loaded_at),
    )

conn.commit()
print(f"Loaded {len(articles)} rows into bronze.news_articles_snapshot (loaded_at={batch_loaded_at})")
cur.close()
conn.close()