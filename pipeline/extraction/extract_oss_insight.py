import json
import time
import requests
import psycopg2
import psycopg2.extras

BASE_URL = "https://api.ossinsight.io/v1"


def get_all_tracked_repos():
    """[GIS] Pull the FULL repo universe (fixed + dynamically discovered)
    directly from the existing GitHub Trends gold table, so this stays
    in sync automatically as new repos get discovered over time."""
    conn = psycopg2.connect(
        host="portfolio_postgres", port=5432, dbname="portfolio",
        user="readonly_user", password="readonlypass123",
    )
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT repo_full_name, cohort FROM dbt_dev_gold.dim_github_repo")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {row["repo_full_name"]: row["cohort"] for row in rows}


def get_stargazer_countries(repo, max_retries=3):
    owner, name = repo.split('/')
    url = f"{BASE_URL}/repos/{owner}/{name}/stargazers/countries"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers={"Accept": "application/json"}, timeout=20)
            if resp.status_code == 200:
                return resp.status_code, resp.json()
            return resp.status_code, None
        except requests.exceptions.RequestException as e:
            print(f"    Attempt {attempt + 1}/{max_retries} failed: {e}")
            time.sleep(2)
    return None, None


all_repos = get_all_tracked_repos()
print(f"Found {len(all_repos)} total tracked repos (all cohorts, fixed + discovered)\n")

results = {}
for i, (repo, cohort) in enumerate(all_repos.items(), 1):
    print(f"[{i}/{len(all_repos)}] Fetching {repo} ({cohort})...")
    status, data = get_stargazer_countries(repo)
    results[repo] = {"repo": repo, "cohort": cohort, "status": status, "data": data}
    if data and "data" in data:
        row_count = data["data"].get("result", {}).get("row_count", 0)
        print(f"  {row_count} countries returned (status {status})")
    else:
        print(f"  FAILED (status {status})")
    time.sleep(1)

with open("oss_insight_output.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\nDone. {len(all_repos)} repos processed. Saved to oss_insight_output.json")