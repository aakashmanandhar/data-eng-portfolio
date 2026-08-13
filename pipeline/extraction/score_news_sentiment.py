"""
Scores real sentiment for every article in silver_news_articles using a
pretrained transformer, via Hugging Face's official InferenceClient with
automatic provider routing - more robust than a hardcoded provider/URL,
since HF's own infra migrated providers mid-build (the exact issue that
broke a raw-requests version of this script).
"""
import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from huggingface_hub import InferenceClient

client = InferenceClient(api_key=os.environ["HUGGINGFACE_API_KEY"], provider="auto")
SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"

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
print(f"Scoring {len(articles)} unscored articles...")

def score_sentiment(text, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = client.text_classification(text[:512], model=SENTIMENT_MODEL)
            top = max(result, key=lambda x: x.score)
            return top.label, top.score
        except Exception as e:
            if "503" in str(e) and attempt < max_retries - 1:
                print("  model warming up, retrying in 10s...")
                time.sleep(10)
                continue
            raise

scored_count = 0
for article in articles:
    text = f"{article['title']} {article['description'] or ''}"
    try:
        label, score = score_sentiment(text)
        cur.execute("""
            INSERT INTO dbt_dev_gold.news_article_sentiment
            (article_id, keyword_id, source_id, sentiment_label, sentiment_score, published_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (article_id) DO NOTHING
        """, (article["article_id"], article["keyword_id"], article["source_id"],
              label, score, article["published_at"]))
        conn.commit()
        scored_count += 1
    except Exception as e:
        print(f"  FAILED on article {article['article_id']}: {e}")
    time.sleep(0.5)

print(f"Scored {scored_count}/{len(articles)} articles")
cur.close()
conn.close()