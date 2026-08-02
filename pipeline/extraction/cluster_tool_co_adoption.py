"""
[Part2] K-means clustering of GitHub repos (tools) by their country-adoption
PATTERN - i.e. which tools tend to be popular in the same countries, not
which countries are similar. Features are the 64 countries with meaningful
signal volume (>=5000 total stargazers), each repo's feature vector is its
% of stargazers from that country (so total popularity is normalized out -
this clusters by WHERE a tool is popular, not how popular it is overall).
"""
import psycopg2
from psycopg2.extras import execute_values
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import numpy as np

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()

cur.execute("""
    SELECT country_code FROM dbt_dev_gold.fact_country_tool_signal
    GROUP BY country_code HAVING SUM(stargazers) >= 5000
""")
significant_countries = sorted(r[0] for r in cur.fetchall())

cur.execute("""
    SELECT repo_full_name FROM dbt_dev_gold.fact_country_tool_signal
    GROUP BY repo_full_name HAVING SUM(stargazers) >= 500
""")
significant_repos = [r[0] for r in cur.fetchall()]

cur.execute("""
    SELECT repo_full_name, country_code, percentage
    FROM dbt_dev_gold.fact_country_tool_signal
    WHERE country_code = ANY(%s) AND repo_full_name = ANY(%s)
""", (significant_countries, significant_repos))
rows = cur.fetchall()

repo_country_pct = {}
for repo, country, pct in rows:
    repo_country_pct.setdefault(repo, {})[country] = float(pct)

repos = sorted(repo_country_pct.keys())
country_idx = {c: i for i, c in enumerate(significant_countries)}

features = []
for repo in repos:
    row = [0.0] * len(significant_countries)
    for country, pct in repo_country_pct[repo].items():
        row[country_idx[country]] = pct
    features.append(row)

X = np.array(features)
X_scaled = StandardScaler().fit_transform(X)

K = 4
model = KMeans(n_clusters=K, random_state=42, n_init=10)
cluster_labels = model.fit_predict(X_scaled)

print(f"\n{'='*60}\nCluster profiles ({len(repos)} repos total):\n{'='*60}")
for c in range(K):
    mask = cluster_labels == c
    members = [repos[i] for i in range(len(repos)) if mask[i]]
    print(f"\nCluster {c}: {mask.sum()} repos")
    print(f"  sample members: {members[:8]}")

cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.tool_co_adoption_cluster (
        repo_full_name TEXT PRIMARY KEY,
        cluster_id INTEGER NOT NULL,
        cluster_name TEXT,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.tool_co_adoption_cluster")
CLUSTER_NAMES = {
    0: "Mainstream Global Tools",
    1: "Apache Big-Data Ecosystem",
    2: "Emerging & Community-Driven",
    3: "Cloud-Warehouse Adapters",
}
rows_to_insert = [
    (repos[i], int(cluster_labels[i]), CLUSTER_NAMES.get(int(cluster_labels[i])))
    for i in range(len(repos))
]
execute_values(
    cur, "INSERT INTO dbt_dev_gold.tool_co_adoption_cluster (repo_full_name, cluster_id, cluster_name) VALUES %s",
    rows_to_insert,
)
conn.commit()
print(f"\nWrote {len(rows_to_insert)} cluster assignments to dbt_dev_gold.tool_co_adoption_cluster")
cur.close()
conn.close()