"""
Extracts data engineering / AI-data-engineering publications from DBLP, the
computer science bibliography (VLDB, SIGMOD, ICDE, etc.). Free, no API key.
More precisely targeted than a general academic index since DBLP only
indexes CS venues.
"""
import time
import requests

QUERIES = [
    "data engineering", "data pipeline", "ETL", "data warehouse", "data lake",
    "lakehouse", "data mesh", "data governance", "data quality",
    "data observability", "data catalog", "data lineage",
    "master data management", "batch processing", "stream processing",
    "change data capture", "workflow orchestration", "data orchestration",
    "data modeling", "dimensional modeling", "feature store",
    "retrieval augmented generation", "LLM agent", "AI agent data pipeline",
    "MLOps", "vector database", "graph database", "knowledge graph",
    "distributed database", "NoSQL database", "database sharding",
    "database replication", "query optimization", "OLAP", "OLTP",
    "time series database", "semantic search", "reverse ETL",
    "self-healing pipeline",
]

BASE_URL = "https://dblp.org/search/publ/api"
LIMIT = 30


def search_publications(query, max_retries=3):
    params = {"q": query, "format": "json", "h": LIMIT}
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=20)
            if resp.status_code == 200:
                hits = resp.json().get("result", {}).get("hits", {}).get("hit", [])
                return hits
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(3)
    return []


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying DBLP for: {q}...")
    hits = search_publications(q)
    for h in hits:
        info = h.get("info", {})
        key = h.get("@id") or info.get("key")
        title = info.get("title")
        if not key or key in results or not title:
            continue
        authors_raw = info.get("authors", {}).get("author", [])
        if isinstance(authors_raw, dict):
            authors_raw = [authors_raw]
        authors = ", ".join([a.get("text", "") for a in authors_raw][:6]) if authors_raw else ""
        year = info.get("year")
        if isinstance(year, list):
            # DBLP sometimes returns a list of years for cross-listed publications - use the most recent
            year = year[-1] if year else None
        results[key] = {
            "external_id": str(key),
            "title": title[:500],
            "summary": "",
            "url": info.get("ee") or info.get("url") or "",
            "authors": authors[:500],
            "published_at": f"{year}-01-01" if year else None,
            "score": 0,
        }
    print(f"  {len(hits)} hits, {len(results)} unique so far")
    time.sleep(1.5)

results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("dblp_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to dblp_output.json")
