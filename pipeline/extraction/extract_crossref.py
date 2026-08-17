"""
Extracts data engineering / AI-data-engineering research papers from Crossref.
Free, no API key required. Strong for DOI-backed published papers and real
citation counts (journal articles, conference proceedings).
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

BASE_URL = "https://api.crossref.org/works"
LIMIT = 25
MAILTO = "aakash@aakashmanandhar.tech"  # Crossref's "polite pool" best practice


def search_works(query, max_retries=3):
    params = {
        "query": query,
        "rows": LIMIT,
        "sort": "published",
        "order": "desc",
        "mailto": MAILTO,
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=20)
            if resp.status_code == 200:
                return resp.json().get("message", {}).get("items", [])
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(3)
    return []


def extract_date(item):
    # Crossref's own metadata occasionally has garbage years (some publisher
    # deposits carry placeholder dates like 2121 or 2200) - reject anything
    # implausibly far in the future rather than trust it blindly.
    import datetime
    max_year = datetime.date.today().year + 2
    for field in ("published-print", "published-online", "issued"):
        parts = item.get(field, {}).get("date-parts", [[None]])[0]
        if parts and parts[0]:
            y = parts[0]
            if not (1900 <= y <= max_year):
                continue
            m = parts[1] if len(parts) > 1 else 1
            d = parts[2] if len(parts) > 2 else 1
            return f"{y:04d}-{m:02d}-{d:02d}"
    return None


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying Crossref for: {q}...")
    items = search_works(q)
    for it in items:
        doi = it.get("DOI")
        titles = it.get("title") or []
        if not doi or doi in results or not titles:
            continue
        authors = ", ".join([
            f"{a.get('given', '')} {a.get('family', '')}".strip()
            for a in (it.get("author") or [])
        ][:6])
        results[doi] = {
            "external_id": doi,
            "title": titles[0][:500],
            "summary": (it.get("abstract") or "")[:2000],
            "url": it.get("URL") or f"https://doi.org/{doi}",
            "authors": authors[:500],
            "published_at": extract_date(it),
            "score": it.get("is-referenced-by-count") or 0,
        }
    print(f"  {len(items)} hits, {len(results)} unique so far")
    time.sleep(1)

results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("crossref_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to crossref_output.json")
