import os
import json
import time
import requests

# Algolia doesn't support boolean OR in a single query string, so each cohort
# is a list of individual keyword phrases, queried separately and summed.
# Note: this is a SUM of per-keyword story counts, which may double-count a
# story matching multiple keywords — a reasonable approximation for a volume
# signal, not a deduplicated unique count.
QUERIES = {
    "traditional": ["data engineering", "data pipeline", "ETL", "data warehouse"],
    "ai": ["AI agent", "LLM pipeline", "retrieval augmented", "AI data engineering"],
}


def get_hn_count(query, max_retries=3):
    url = "https://hn.algolia.com/api/v1/search"
    params = {"query": query, "tags": "story", "hitsPerPage": 0}
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code == 200:
                return resp.status_code, resp.json().get("nbHits")
            return resp.status_code, None
        except requests.exceptions.RequestException as e:
            print(f"    Attempt {attempt + 1}/{max_retries} failed: {e}")
            time.sleep(2)
    return None, None


results = {}
for cohort, keywords in QUERIES.items():
    print(f"Querying Hacker News for cohort: {cohort}...")
    breakdown = {}
    total = 0
    for kw in keywords:
        status, count = get_hn_count(kw)
        breakdown[kw] = count
        if count:
            total += count
        print(f"  '{kw}': {count} stories (status {status})")
        time.sleep(1)

    results[cohort] = {
        "cohort": cohort,
        "total_stories": total,
        "keyword_breakdown": breakdown,
    }
    print(f"  {cohort} total (summed): {total}")

with open("hackernews_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to hackernews_output.json")