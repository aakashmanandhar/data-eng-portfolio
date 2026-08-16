import json
import time
import requests

KEYWORDS = [
    "data engineering", "data pipeline", "ETL", "data warehouse",
    "AI agent", "LLM pipeline", "retrieval augmented", "AI data engineering",
    "vector database", "data quality", "MLOps", "data mesh", "agentic",
]

HITS_PER_QUERY = 30


def search_stories(query, max_retries=3):
    url = "https://hn.algolia.com/api/v1/search"
    params = {
        "query": query,
        "tags": "story",
        "hitsPerPage": HITS_PER_QUERY,
        "numericFilters": "points>5",
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code == 200:
                return resp.json().get("hits", [])
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(2)
    return []


results = {}
for kw in KEYWORDS:
    print(f"Querying HN for: {kw}...")
    hits = search_stories(kw)
    for hit in hits:
        object_id = hit.get("objectID")
        if not object_id or object_id in results:
            continue
        title = hit.get("title") or hit.get("story_title")
        url = hit.get("url") or hit.get("story_url") or f"https://news.ycombinator.com/item?id={object_id}"
        if not title:
            continue
        results[object_id] = {
            "external_id": object_id,
            "title": title[:500],
            "summary": "",
            "url": url,
            "score": hit.get("points", 0),
            "published_at": hit.get("created_at"),
            "topic_tags": kw,
        }
    print(f"  {len(hits)} hits, {len(results)} unique so far")
    time.sleep(1)

with open("research_hn_output.json", "w") as f:
    json.dump(list(results.values()), f, indent=2)
print(f"\nDone. {len(results)} unique stories saved to research_hn_output.json")
