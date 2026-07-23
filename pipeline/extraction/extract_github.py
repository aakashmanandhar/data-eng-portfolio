import os
import json
import time
import requests
from dotenv import load_dotenv
import re


load_dotenv()

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

TRACKED_REPOS = {
    # Traditional Data Engineering
    "apache/airflow": "traditional",
    "dbt-labs/dbt-core": "traditional",
    "apache/spark": "traditional",
    "apache/kafka": "traditional",
    "airbytehq/airbyte": "traditional",
    "dagster-io/dagster": "traditional",
    "apache/flink": "traditional",
    "apache/nifi": "traditional",
    "great-expectations/great_expectations": "traditional",
    "meltano/meltano": "traditional",
    "PrefectHQ/prefect": "traditional",
    "duckdb/duckdb": "traditional",
    "ClickHouse/ClickHouse": "traditional",
    "trinodb/trino": "traditional",

    # AI Data Engineering
    "langchain-ai/langchain": "ai",
    "run-llama/llama_index": "ai",
    "pgvector/pgvector": "ai",
    "weaviate/weaviate": "ai",
    "milvus-io/milvus": "ai",
    "mlflow/mlflow": "ai",
    "deepset-ai/haystack": "ai",
    "qdrant/qdrant": "ai",
    "chroma-core/chroma": "ai",
    "feast-dev/feast": "ai",
    "ray-project/ray": "ai",
    "BerriAI/litellm": "ai",

    # Platform: Databricks vs Snowflake
    "databricks/databricks-sdk-py": "platform-databricks",
    "databricks/dbt-databricks": "platform-databricks",
    "snowflakedb/snowflake-connector-python": "platform-snowflake",
    "dbt-labs/dbt-snowflake": "platform-snowflake",

    # Cloud providers
    "Azure/azure-sdk-for-python": "cloud-azure",
    "boto/boto3": "cloud-aws",
    "googleapis/google-cloud-python": "cloud-gcp",
    "googleapis/python-bigquery": "cloud-gcp",
    "dbt-labs/dbt-bigquery": "cloud-gcp",
    "dbt-labs/dbt-redshift": "cloud-aws",

    # RDBMS
    "postgres/postgres": "rdbms",
    "mysql/mysql-server": "rdbms",
    "MariaDB/server": "rdbms",
    "microsoft/mssql-docker": "rdbms",

    # NoSQL
    "mongodb/mongo": "nosql",
    "redis/redis": "nosql",
    "apache/cassandra": "nosql",
    "elastic/elasticsearch": "nosql",

    # Lakehouse table formats
    "delta-io/delta": "lakehouse",
    "apache/iceberg": "lakehouse",
    "apache/hudi": "lakehouse",

    # Programming languages (used across data engineering)
    "python/cpython": "language",
    "golang/go": "language",
    "rust-lang/rust": "language",
    "scala/scala": "language",

    # BI / Analytics tools
    "microsoft/powerbi-visuals-tools": "analytics-bi",
    "tableau/server-client-python": "analytics-bi",
    "apache/superset": "analytics-bi",
    "metabase/metabase": "analytics-bi",
    "getredash/redash": "analytics-bi",
    "grafana/grafana": "analytics-bi",
}

def get_contributor_count(full_name, max_retries=3):
    url = f"https://api.github.com/repos/{full_name}/contributors"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    params = {"per_page": 1, "anon": "true"}
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=15)
            if resp.status_code == 200:
                link = resp.headers.get("Link", "")
                match = re.search(r'page=(\d+)>; rel="last"', link)
                return int(match.group(1)) if match else 1
            return None
        except requests.exceptions.RequestException as e:
            print(f"    Contributor count attempt {attempt + 1}/{max_retries} failed: {e}")
            time.sleep(2)
    return None

def get_repo_stats(full_name, max_retries=3):
    url = f"https://api.github.com/repos/{full_name}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            return resp.status_code, resp.json() if resp.status_code == 200 else resp.text
        except requests.exceptions.RequestException as e:
            print(f"  Attempt {attempt + 1}/{max_retries} failed: {e}")
            time.sleep(2)
    return None, f"Failed after {max_retries} retries"


results = {}
for repo, cohort in TRACKED_REPOS.items():
    print(f"Fetching {repo}...")
    status, data = get_repo_stats(repo)
    time.sleep(0.5)

    if status == 200:
        contributor_count = get_contributor_count(repo)
        results[repo] = {
            "cohort": cohort,
            "stars": data.get("stargazers_count"),
            "forks": data.get("forks_count"),
            "open_issues": data.get("open_issues_count"),
            "language": data.get("language"),
            "created_at": data.get("created_at"),
            "pushed_at": data.get("pushed_at"),
            "description": data.get("description"),
            "contributor_count": contributor_count,
        }
        print(f"  stars={results[repo]['stars']}, forks={results[repo]['forks']}, contributors={contributor_count}")
    else:
        results[repo] = {"cohort": cohort, "error": str(data), "status": status}
        print(f"  ERROR: {status}")

with open("github_raw_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to github_raw_output.json")

