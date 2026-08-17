"""
Extracts data engineering / AI-data-engineering research works from OpenAlex.
Fully open, no API key required at all. Successor to Microsoft Academic Graph.
Uses OpenAlex's "polite pool" (faster, more reliable) by including a mailto
param, per their documented best practice - no account/signup needed for this.
"""
import time
import requests

QUERIES = [
    # Core data engineering
    "data engineering",
    "data pipeline",
    "ETL",
    "ELT data integration",
    "data extraction",
    "data loading",
    "data integration",
    "data ingestion",
    "data transformation",
    "data wrangling",
    "data cleaning",
    "data deduplication",
    "data pipeline automation",
    # Storage & architecture
    "data warehouse",
    "data lake",
    "lakehouse architecture",
    "data mesh",
    "data fabric",
    "data virtualization",
    "federated data architecture",
    "columnar storage",
    "distributed data processing",
    "distributed database systems",
    # Databases (general)
    "relational database systems",
    "NoSQL database",
    "database management systems",
    "distributed database",
    "database sharding",
    "database replication",
    "database indexing",
    "query processing database",
    "transaction processing database",
    "OLAP database",
    "OLTP database",
    "time series database",
    # AI-native / AI databases
    "vector database",
    "embedding database",
    "graph database",
    "knowledge graph",
    "semantic search database",
    "similarity search",
    "AI-native database",
    # Governance & quality
    "data governance",
    "data quality",
    "data observability",
    "data catalog",
    "data lineage",
    "data contracts",
    "master data management",
    "metadata management",
    "data reliability engineering",
    # Processing paradigms
    "batch processing",
    "stream processing",
    "real-time data processing",
    "change data capture",
    "event-driven architecture",
    "event streaming",
    "query optimization",
    # Orchestration & operations
    "workflow orchestration",
    "data orchestration",
    "pipeline scheduling",
    "DataOps",
    "data DevOps",
    # Data modeling
    "data modeling",
    "dimensional modeling",
    "star schema",
    "data vault modeling",
    "semantic layer",
    # ML/AI-data engineering crossover
    "feature store machine learning",
    "feature engineering pipeline",
    "retrieval augmented generation",
    "LLM agent",
    "AI agent data pipeline",
    "AI agent workflow automation",
    "MLOps",
    "LLMOps",
    "machine learning pipeline",
    "model serving pipeline",
    "data-centric AI",
    # Emerging concepts
    "reverse ETL",
    "data product",
    "self-healing data pipeline",
]

BASE_URL = "https://api.openalex.org/works"
LIMIT = 25
MAILTO = "aakash@aakashmanandhar.tech"  # polite pool per OpenAlex docs


def search_works(query, max_retries=3):
    params = {
        "search": query,
        "per_page": LIMIT,
        "sort": "publication_date:desc",
        "mailto": MAILTO,
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=20)
            if resp.status_code == 200:
                return resp.json().get("results", [])
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(3)
    return []


def extract_abstract(inverted_index):
    if not inverted_index:
        return ""
    positions = {}
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions[i] = word
    return " ".join(positions[i] for i in sorted(positions))[:2000]


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying OpenAlex for: {q}...")
    works = search_works(q)
    for w in works:
        wid = w.get("id")
        if not wid or wid in results or not w.get("title"):
            continue
        authors = ", ".join([
            a.get("author", {}).get("display_name", "")
            for a in (w.get("authorships") or [])
        ][:6])
        results[wid] = {
            "external_id": wid.replace("https://openalex.org/", ""),
            "title": w["title"][:500],
            "summary": extract_abstract(w.get("abstract_inverted_index")),
            "url": w.get("doi") or w.get("id") or "",
            "authors": authors[:500],
            "published_at": w.get("publication_date"),
            "score": w.get("cited_by_count") or 0,
        }
    print(f"  {len(works)} hits, {len(results)} unique so far")
    time.sleep(1)

results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("openalex_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to openalex_output.json")
