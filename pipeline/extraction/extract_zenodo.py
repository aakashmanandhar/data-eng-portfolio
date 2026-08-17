"""
Extracts data engineering / AI-data-engineering research outputs from
Zenodo (CERN-run open research repository). Free, no API key required for
search at moderate volume. Filtered to type=publication to exclude datasets
and software records.
"""
import time
import requests

QUERIES = [
    "data engineering", "data pipeline", "ETL", "data warehouse", "data lake",
    "data mesh", "data governance", "data quality", "data lineage",
    "workflow orchestration", "stream processing", "batch processing",
    "retrieval augmented generation", "LLM agent", "AI agent pipeline",
    "MLOps", "vector database", "graph database", "knowledge graph",
    "distributed database", "feature store", "self-healing pipeline",
    "data observability", "semantic search",
]

BASE_URL = "https://zenodo.org/api/records"
LIMIT = 25


def search_records(query, max_retries=3):
    params = {
        "q": query,
        "size": LIMIT,
        "sort": "mostrecent",
        "type": "publication",
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=20)
            if resp.status_code == 200:
                return resp.json().get("hits", {}).get("hits", [])
            if resp.status_code == 429:
                print(f"  rate limited, waiting before retry {attempt + 1}/{max_retries}")
                time.sleep(10)
                continue
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(3)
    return []


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying Zenodo for: {q}...")
    records = search_records(q)
    for r in records:
        rid = str(r.get("id"))
        meta = r.get("metadata", {})
        title = meta.get("title")
        if not rid or rid in results or not title:
            continue
        creators = meta.get("creators", [])
        authors = ", ".join([c.get("name", "") for c in creators][:6])
        results[rid] = {
            "external_id": rid,
            "title": title[:500],
            "summary": (meta.get("description") or "")[:2000],
            "url": r.get("links", {}).get("self_html") or "",
            "authors": authors[:500],
            "published_at": meta.get("publication_date"),
            "score": r.get("stats", {}).get("downloads", 0) if r.get("stats") else 0,
        }
    print(f"  {len(records)} hits, {len(results)} unique so far")
    time.sleep(2)

results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("zenodo_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to zenodo_output.json")
