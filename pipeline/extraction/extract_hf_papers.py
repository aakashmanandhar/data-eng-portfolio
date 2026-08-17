"""
Extracts AI/ML papers from Hugging Face's Daily Papers search API. Free, no
auth. Data originates primarily from arXiv but is curated by real community
submission + upvotes, so it surfaces which AI-DE-crossover papers people are
actually engaging with, not just what exists. Note: replaces Papers With
Code, which Meta shut down in July 2025 (confirmed via live search - the old
API endpoint no longer returns valid JSON).
"""
import time
import requests

QUERIES = [
    "data engineering", "data pipeline", "ETL", "data lake", "data warehouse",
    "retrieval augmented generation", "LLM agent", "AI agent",
    "vector database", "graph database", "knowledge graph",
    "feature store", "MLOps", "LLMOps", "data quality", "data cleaning",
    "self-healing pipeline", "anomaly detection pipeline",
    "workflow orchestration", "stream processing", "real-time data",
    "semantic search", "embedding retrieval", "data-centric AI",
]

BASE_URL = "https://huggingface.co/api/papers/search"


def search_papers(query, max_retries=3):
    params = {"q": query}
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else data.get("results", [])
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except (requests.exceptions.RequestException, ValueError) as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(3)
    return []


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying Hugging Face Papers for: {q}...")
    items = search_papers(q)
    for it in items:
        pid = it.get("id") or it.get("paper", {}).get("id")
        title = it.get("title") or it.get("paper", {}).get("title")
        if not pid or pid in results or not title:
            continue
        authors_raw = it.get("authors") or it.get("paper", {}).get("authors") or []
        authors = ", ".join([
            a.get("name", "") if isinstance(a, dict) else str(a)
            for a in authors_raw
        ][:6])
        results[pid] = {
            "external_id": f"hf-{pid}",
            "title": title[:500],
            "summary": (it.get("summary") or it.get("paper", {}).get("summary") or "")[:2000],
            "url": f"https://huggingface.co/papers/{pid}",
            "authors": authors[:500],
            "published_at": it.get("publishedAt") or it.get("paper", {}).get("publishedAt"),
            "score": it.get("upvotes") or it.get("paper", {}).get("upvotes") or 0,
        }
    print(f"  {len(items)} hits, {len(results)} unique so far")
    time.sleep(1.5)

results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("hf_papers_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to hf_papers_output.json")
