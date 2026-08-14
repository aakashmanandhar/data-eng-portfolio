"""
Extracts real DE/AI-DE news articles from Currents API, filtered to a curated,
comprehensive keyword list of real data engineering and AI data engineering
terms - tools, databases, warehouses, streaming, orchestration, BI, and the
AI/LLM-data engineering crossover.

Docs: https://currentsapi.services/en/docs/search

Two relevance safeguards, since a first pass showed real false positives
(loose 'keywords' matching pulled in unrelated articles, e.g. "data mesh"
matching a 3D computer-vision paper via "mesh"):
  1. Uses the 'query' param with a quoted exact phrase, not loose 'keywords'
  2. Post-filters to require the term to genuinely appear in title/description
"""
import os
import json
import re
import time
import requests

CURRENTS_API_KEY = os.environ["CURRENTS_API_KEY"]
BASE_URL = "https://api.currentsapi.services/v2/search"

# Curated DE/AI-DE keyword list - comprehensive, organized by category,
# reusing tool names already established in GitHub Trends' own cohorts
# where applicable for cross-pipeline consistency.
KEYWORDS = [
    # Orchestration
    "Apache Airflow", "dbt", "Dagster", "Prefect", "Mage data", "Luigi Spotify",

    # Processing & compute engines
    "Apache Spark", "Apache Flink", "Apache Beam", "PySpark", "Ray distributed",
    "Dask", "Apache NiFi",

    # Streaming & messaging
    "Apache Kafka", "Apache Pulsar", "Redpanda streaming", "Apache Airbyte",
    "Meltano",

    # Warehouses & lakehouses
    "Snowflake", "Databricks", "Google BigQuery", "Amazon Redshift",
    "Apache Iceberg", "Delta Lake", "Apache Hudi", "DuckDB", "ClickHouse",
    "Trino", "Apache Presto", "StarRocks",

    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Apache Cassandra",
    "Elasticsearch", "MariaDB", "Microsoft SQL Server", "CockroachDB",

    # Data quality & observability
    "Great Expectations data", "Monte Carlo data observability", "Soda data quality",

    # BI & analytics
    "Apache Superset", "Grafana", "Looker", "Tableau", "Power BI", "Metabase",

    # Cloud data platforms
    "AWS Glue", "Azure Data Factory", "Google Cloud Dataflow", "Microsoft Fabric",
    "Azure Synapse",

    # AI / LLM-data engineering crossover
    "LangChain", "LlamaIndex", "vector database", "pgvector", "Weaviate",
    "Milvus vector", "Qdrant", "Chroma vector database", "Pinecone vector",
    "MLflow", "Haystack AI", "Feast feature store", "LiteLLM",
    "RAG retrieval augmented generation", "LLM data pipeline", "feature store",
    "MLOps", "data mesh", "lakehouse architecture",

    # Broader concepts
    "data engineering", "data pipeline", "ETL pipeline", "ELT pipeline",
    "data warehouse", "data governance", "machine learning engineering",
]


def fetch_articles_for_keyword(keyword, page_size=20, max_retries=2):
    params = {
        "query": f'"{keyword}"',  # quoted = exact phrase match, not loose keyword matching
        "language": "en",
        "category": "science_technology",
        "page_size": page_size,
        "apiKey": CURRENTS_API_KEY,
    }
    for attempt in range(max_retries):
        resp = requests.get(BASE_URL, params=params, timeout=30)
        if resp.status_code == 429:
            wait = 20 * (attempt + 1)  # capped much lower - fewer, shorter retries so one
                                        # stubborn keyword can't burn 7+ minutes on its own;
                                        # this pipeline runs daily, so a keyword that fails
                                        # today genuinely gets another chance tomorrow
            print(f"    rate limited, waiting {wait}s before retry ({attempt + 1}/{max_retries})...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        data = resp.json()
        return data.get("news", [])
    print(f"    still rate limited after {max_retries} retries, skipping this keyword for today")
    return []


def is_genuinely_relevant(article, keyword):
    text = (article.get("title", "") + " " + article.get("description", "")).lower()
    pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
    return re.search(pattern, text) is not None


def main():
    all_results = []
    filtered_out_count = 0

    for kw in KEYWORDS:
        try:
            articles = fetch_articles_for_keyword(kw)
            kept = 0
            for article in articles:
                if is_genuinely_relevant(article, kw):
                    article["_matched_keyword"] = kw
                    all_results.append(article)
                    kept += 1
                else:
                    filtered_out_count += 1
            print(f"  {kw!r}: {kept}/{len(articles)} kept after relevance filter")
        except requests.exceptions.RequestException as e:
            print(f"  {kw!r}: FAILED - {e}")
        time.sleep(8)  # front-loading more delay to genuinely prevent 429s, rather than
                        # relying on expensive reactive retries - trades a longer minimum
                        # runtime for a much lower, bounded worst case
                        
    print(f"\nTotal articles kept: {len(all_results)}")
    print(f"Total filtered out as false positives: {filtered_out_count}")
    with open("de_ai_news_raw_output.json", "w") as f:
        json.dump(all_results, f, indent=2)
    print("Saved to de_ai_news_raw_output.json")


if __name__ == "__main__":
    main()