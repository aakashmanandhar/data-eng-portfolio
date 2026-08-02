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
# Cluster IDs from k-means are NOT stable across runs (confirmed: the same
# semantic grouping can get a different numeric ID depending on the day's
# exact data) - names are derived from real cluster CONTENT via anchor
# repos known to always belong to a specific real-world category, not by
# positional ID, so labels stay correct regardless of how k-means numbers
# the clusters on any given day.
cluster_members = {}
for i in range(len(repos)):
    cluster_members.setdefault(int(cluster_labels[i]), []).append(repos[i])

ANCHOR_RULES = [
    ("Apache Big-Data Ecosystem", "apache/flink"),
    ("Cloud-Warehouse Adapters", "dbt-labs/dbt-bigquery"),
]
cluster_id_to_name = {}
named_clusters = set()
for name, anchor in ANCHOR_RULES:
    for cid, members in cluster_members.items():
        if anchor in members and cid not in cluster_id_to_name:
            cluster_id_to_name[cid] = name
            named_clusters.add(cid)

remaining = [cid for cid in cluster_members if cid not in cluster_id_to_name]
remaining.sort(key=lambda cid: len(cluster_members[cid]), reverse=True)
remaining_names = ["Mainstream Global Tools", "Emerging & Community-Driven"]
for cid, name in zip(remaining, remaining_names):
    cluster_id_to_name[cid] = name
for cid in remaining[len(remaining_names):]:
    cluster_id_to_name[cid] = f"Cluster {cid}"  # fallback if k ever changes

rows_to_insert = [
    (repos[i], int(cluster_labels[i]), cluster_id_to_name[int(cluster_labels[i])])
    for i in range(len(repos))
]
execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.tool_co_adoption_cluster (repo_full_name, cluster_id, cluster_name) VALUES %s
       ON CONFLICT (repo_full_name) DO UPDATE SET
           cluster_id = EXCLUDED.cluster_id,
           cluster_name = EXCLUDED.cluster_name,
           generated_at = CURRENT_DATE""",
    rows_to_insert,
)
conn.commit()
print(f"\nWrote {len(rows_to_insert)} cluster assignments to dbt_dev_gold.tool_co_adoption_cluster")
cur.close()
conn.close()