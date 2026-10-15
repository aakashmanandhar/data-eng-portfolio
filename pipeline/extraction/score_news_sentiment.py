"""
Scores sentiment for every article in silver_news_articles with a pretrained
transformer (cardiffnlp/twitter-roberta-base-sentiment-latest), run locally
on CPU inside the Django container.

Running the model locally instead of the Hugging Face Inference API removes
the external dependency: no API credits, no provider routing, no rate limits.
The model weights are baked into the image at build time.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import torch
from transformers import pipeline

torch.set_num_threads(2)
SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
BATCH_SIZE = 16

conn = psycopg2.connect(
    host=os.environ.get("POSTGRES_HOST", "portfolio_postgres"),
    dbname=os.environ.get("POSTGRES_DB", "portfolio"),
    user=os.environ.get("POSTGRES_USER", "postgres"),
    password=os.environ.get("POSTGRES_PASSWORD", "localdevpassword"),
    port=os.environ.get("POSTGRES_PORT", "5432"),
)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.news_article_sentiment (
        article_id TEXT PRIMARY KEY,
        keyword_id INTEGER NOT NULL,
        source_id INTEGER NOT NULL,
        sentiment_label TEXT NOT NULL,
        sentiment_score NUMERIC NOT NULL,
        published_at TIMESTAMPTZ NOT NULL,
        scored_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")
conn.commit()

cur.execute("""
    SELECT a.article_id, a.title, a.description, a.published_at,
           dk.keyword_id, ds.source_id
    FROM dbt_dev_silver.silver_news_articles a
    JOIN dbt_dev_gold.dim_keyword dk ON a.matched_keyword = dk.keyword
    JOIN dbt_dev_gold.dim_source ds ON a.source_domain = ds.source_domain
    WHERE a.article_id NOT IN (SELECT article_id FROM dbt_dev_gold.news_article_sentiment)
""")
articles = cur.fetchall()
print(f"Scoring {len(articles)} unscored articles locally...")

if not articles:
    print("Nothing to score.")
    raise SystemExit(0)

classifier = pipeline(
    "text-classification",
    model=SENTIMENT_MODEL,
    truncation=True,
    max_length=512,
    device=-1,
)

scored = 0
for i in range(0, len(articles), BATCH_SIZE):
    batch = articles[i:i + BATCH_SIZE]
    texts = [f"{a['title']} {a['description'] or ''}"[:2000] for a in batch]
    results = classifier(texts, batch_size=BATCH_SIZE)
    for a, r in zip(batch, results):
        cur.execute("""
            INSERT INTO dbt_dev_gold.news_article_sentiment
            (article_id, keyword_id, source_id, sentiment_label, sentiment_score, published_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (article_id) DO NOTHING
        """, (a["article_id"], a["keyword_id"], a["source_id"],
              r["label"].lower(), float(r["score"]), a["published_at"]))
    conn.commit()
    scored += len(batch)
    print(f"  scored {scored}/{len(articles)}")

cur.close()
conn.close()
print(f"Done. Scored {scored} articles.")
