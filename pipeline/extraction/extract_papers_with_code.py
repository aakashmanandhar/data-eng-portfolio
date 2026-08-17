"""
Extracts AI/ML papers linked to real code implementations from Papers With
Code. Free, no API key. Strong for the AI-DE crossover angle (LLM agents,
RAG, vector databases) since it surfaces papers people are actually building
on, not just publishing.
"""
import time
import requests

QUERIES = [
    "data engineering", "data pipeline", "ETL", "data lake", "data warehouse",
    "retrieval augmented generation", "LLM agent", "AI agent",
    "vector database", "graph database", "knowledge graph",
    "feature store", "MLOps", "LLMOps", "data quality", "data cleaning",
    "data augmentation pipeline", "self-healing", "anomaly detection pipeline",
    "workflow orchestration", "stream processing", "real-time data",
    "semantic search", "embedding retrieval", "data-centric AI",
]

BASE_URL = "https://paperswithcode.com/api/v1/search/"
LIMIT = 30


def search_papers(query, max_retries=3):
    params = {"q": query, "items_per_page": LIMIT}
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


results = {}
for i, q in enumerate(QUERIES):
    print(f"[{i+1}/{len(QUERIES)}] Querying Papers With Code for: {q}...")
    items = search_papers(q)
    for it in items:
        paper = it.get("paper") or it
        pid = paper.get("id")
        title = paper.get("title")
        if not pid or pid in results or not title:
            continue
        results[pid] = {
            "external_id": pid,
            "title": title[:500],
            "summary": (paper.get("abstract") or "")[:2000],
            "url": paper.get("url_abs") or paper.get("url_pdf") or "",
            "authors": ", ".join((paper.get("authors") or [])[:6])[:500],
            "published_at": paper.get("published"),
            "score": it.get("repository", {}).get("stars", 0) if it.get("repository") else 0,
        }
    print(f"  {len(items)} hits, {len(results)} unique so far")
    time.sleep(1.5)

results = {k: v for k, v in results.items() if v["published_at"]}

import json
with open("papers_with_code_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} papers saved to papers_with_code_output.json")
