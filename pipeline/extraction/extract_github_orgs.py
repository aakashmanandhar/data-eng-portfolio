import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

TRACKED_ORGS = ["apache", "dbt-labs", "airbytehq", "astronomer"]


def get_all_org_repos(org, max_retries=3):
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    all_repos = []
    page = 1
    while True:
        url = f"https://api.github.com/orgs/{org}/repos"
        params = {"per_page": 100, "page": page}
        for attempt in range(max_retries):
            try:
                resp = requests.get(url, headers=headers, params=params, timeout=15)
                break
            except requests.exceptions.RequestException as e:
                print(f"    Attempt {attempt + 1}/{max_retries} failed: {e}")
                time.sleep(2)
        else:
            print(f"    Giving up on page {page} for {org}")
            break

        if resp.status_code != 200:
            print(f"    ERROR page {page}: {resp.status_code}")
            break

        page_data = resp.json()
        if not page_data:
            break

        all_repos.extend(page_data)
        page += 1
        time.sleep(0.3)

    return all_repos


results = {}
for org in TRACKED_ORGS:
    print(f"Fetching all repos for org: {org}...")
    repos = get_all_org_repos(org)
    print(f"  Found {len(repos)} total public repos")

    total_stars = sum(r.get("stargazers_count", 0) for r in repos)
    total_forks = sum(r.get("forks_count", 0) for r in repos)
    top_repos = sorted(repos, key=lambda r: r.get("stargazers_count", 0), reverse=True)[:10]

    results[org] = {
        "total_public_repos": len(repos),
        "aggregate_stars": total_stars,
        "aggregate_forks": total_forks,
        "top_repos": [
            {
                "full_name": r["full_name"],
                "stars": r.get("stargazers_count"),
                "language": r.get("language"),
                "pushed_at": r.get("pushed_at"),
            }
            for r in top_repos
        ],
    }
    print(f"  Aggregate stars: {total_stars}, top repo: {top_repos[0]['full_name'] if top_repos else 'N/A'}")

with open("github_org_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to github_org_output.json")