import os
import json
import time
import requests
from dotenv import load_dotenv
load_dotenv('/secrets/.env')

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

TOPICS = [
    "llm-agents",
    "agentic-ai",
    "rag",
    "retrieval-augmented-generation",
    "mlops",
    "vector-database",
    "data-quality",
    "data-mesh",
    "ai-agents",
    "data-orchestration",
]

RESULTS_PER_TOPIC = 15


def search_topic(topic):
    url = "https://api.github.com/search/repositories"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    params = {
        "q": f"topic:{topic}",
        "sort": "stars",
        "order": "desc",
        "per_page": RESULTS_PER_TOPIC,
    }
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=15)
            return resp.status_code, resp.json() if resp.status_code == 200 else resp.text
        except requests.exceptions.RequestException as e:
            print(f"  Attempt {attempt + 1}/3 failed: {e}")
            time.sleep(2)
    return None, "Failed after 3 retries"


results = []
seen_repos = set()
for topic in TOPICS:
    print(f"Searching topic: {topic}...")
    status, data = search_topic(topic)
    time.sleep(1.5)
    if status == 200:
        for item in data.get("items", []):
            full_name = item["full_name"]
            if full_name in seen_repos:
                continue
            seen_repos.add(full_name)
            results.append({
                "external_id": full_name,
                "topic_tags": topic,
                "title": full_name,
                "summary": (item.get("description") or "")[:2000],
                "url": item.get("html_url"),
                "score": item.get("stargazers_count", 0),
                "published_at": item.get("pushed_at"),
            })
        print(f"  Found {len(data.get('items', []))} repos (total matching: {data.get('total_count')})")
    else:
        print(f"  ERROR: {status}")

with open("research_repos_output.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\nDone. {len(results)} unique repos discovered. Saved to research_repos_output.json")
