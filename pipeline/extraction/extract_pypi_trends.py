import time
import requests

PACKAGES = [
    "dbt-core", "dagster", "airbyte", "great-expectations", "langchain",
    "llama-index", "airflow", "prefect", "pandas", "polars",
    "duckdb", "pyspark", "chromadb", "pinecone-client", "weaviate-client",
    "haystack-ai", "crewai", "autogen", "instructor", "guardrails-ai",
]

BASE_URL = "https://pypistats.org/api/packages/{}/recent"


def fetch_package_stats(package, max_retries=3):
    url = BASE_URL.format(package)
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(2)
    return None


results = []
for pkg in PACKAGES:
    print(f"Fetching PyPI stats for: {pkg}...")
    data = fetch_package_stats(pkg)
    if data and "data" in data:
        results.append({
            "tool_name": pkg,
            "last_day": data["data"].get("last_day", 0),
            "last_week": data["data"].get("last_week", 0),
            "last_month": data["data"].get("last_month", 0),
        })
        print(f"  last_month: {data['data'].get('last_month', 0)}")
    else:
        print(f"  no data for {pkg}, skipping")
    time.sleep(1)

import json
with open("pypi_trends_output.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\nDone. {len(results)} packages saved to pypi_trends_output.json")
