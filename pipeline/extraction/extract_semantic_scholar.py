"""
Extracts data engineering / AI-data-engineering research papers from the
Semantic Scholar Graph API. Free, no API key required for basic use
(rate-limited to ~100 req/5min without a key), ~200M papers, real metadata.
Sorted by publicationDate:desc so results skew toward the latest research.
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

BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
FIELDS = "title,abstract,url,authors,year,publicationDate,citationCount,externalIds"
LIMIT = 25


def search_papers(query, max_retries=3):
    params = {
        "query": query,
        "fields": FIELDS,
        "limit": LIMIT,
        "sort": "publicationDate:desc",
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=20)
            if resp.status_code == 200:
                return resp.json().get("data", [])
            if resp.status_code == 429:
                print(f"  rate limited, waiting before retry {attempt + 1}/{max_retries}")
                time.sleep(12)
                continue
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(3)
    return []


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying Semantic Scholar for: {q}...")
    papers = search_papers(q)
    for p in papers:
        pid = p.get("paperId")
        if not pid or pid in results or not p.get("title"):
            continue
        authors = ", ".join([a.get("name", "") for a in (p.get("authors") or [])][:6])
        results[pid] = {
            "external_id": pid,
            "title": p["title"][:500],
            "summary": (p.get("abstract") or "")[:2000],
            "url": p.get("url") or "",
            "authors": authors[:500],
            "published_at": p.get("publicationDate") or (f"{p['year']}-01-01" if p.get("year") else None),
            "score": p.get("citationCount") or 0,
        }
    print(f"  {len(papers)} hits, {len(results)} unique so far")
    time.sleep(2.5)  # be polite to the unauthenticated rate limit

# Drop any without a real published_at (needed downstream)
results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("semantic_scholar_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to semantic_scholar_output.json")
