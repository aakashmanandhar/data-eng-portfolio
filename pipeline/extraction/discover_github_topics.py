import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

TOPICS = [
    "data-engineering",
    "etl",
    "data-pipeline",
    "data-ingestion",
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


results = {}
seen_repos = set()

for topic in TOPICS:
    print(f"Searching topic: {topic}...")
    status, data = search_topic(topic)
    time.sleep(1)

    if status == 200:
        for item in data.get("items", []):
            full_name = item["full_name"]
            if full_name in seen_repos:
                continue
            seen_repos.add(full_name)
            results[full_name] = {
                "cohort": f"topic-{topic}",
                "stars": item.get("stargazers_count"),
                "forks": item.get("forks_count"),
                "open_issues": item.get("open_issues_count"),
                "language": item.get("language"),
                "created_at": item.get("created_at"),
                "pushed_at": item.get("pushed_at"),
                "description": item.get("description"),
            }
        print(f"  Found {len(data.get('items', []))} repos (total matching: {data.get('total_count')})")
    else:
        print(f"  ERROR: {status}")

with open("github_discovery_output.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\nDone. {len(results)} unique repos discovered. Saved to github_discovery_output.json")