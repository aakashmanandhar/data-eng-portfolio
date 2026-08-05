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
    SELECT repo_full_name, country_code, AVG(percentage) AS avg_percentage
    FROM dbt_dev_gold.fact_country_tool_signal
    WHERE country_code = ANY(%s) AND repo_full_name = ANY(%s)
    GROUP BY repo_full_name, country_code
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

# Safety net #1: a large cluster picking up a specific "anchor" repo by
# chance isn't really that narrow category (e.g. 85 unrelated repos
# happening to include dbt-bigquery isn't genuinely "Cloud-Warehouse
# Adapters") - only give a narrow anchor name to a cluster small/coherent
# enough to actually be a meaningful, specific grouping.
MAX_ANCHOR_CLUSTER_SIZE = 20
MIN_MEANINGFUL_CLUSTER_SIZE = 3

ANCHOR_RULES = [
    ("Apache Big-Data Ecosystem", "apache/flink"),
    ("Cloud-Warehouse Adapters", "dbt-labs/dbt-bigquery"),
]
cluster_id_to_name = {}
for name, anchor in ANCHOR_RULES:
    for cid, members in cluster_members.items():
        if anchor in members and cid not in cluster_id_to_name and len(members) <= MAX_ANCHOR_CLUSTER_SIZE:
            cluster_id_to_name[cid] = name

# The single largest cluster not already anchor-named is always
# "Mainstream Global Tools" - the biggest, most general group. Anything
# else still unnamed becomes "Emerging & Community-Driven".
remaining = [cid for cid in cluster_members if cid not in cluster_id_to_name]
remaining.sort(key=lambda cid: len(cluster_members[cid]), reverse=True)
mainstream_cid = remaining[0] if remaining else max(cluster_members, key=lambda c: len(cluster_members[c]))
cluster_id_to_name[mainstream_cid] = "Mainstream Global Tools"
for cid in remaining[1:]:
    cluster_id_to_name[cid] = "Emerging & Community-Driven"

# Safety net #2: any cluster too tiny to be a meaningful "family" (fewer
# than MIN_MEANINGFUL_CLUSTER_SIZE repos) gets folded into the mainstream
# group instead of being shown as its own confusing 1-repo category.
final_labels = [int(l) for l in cluster_labels]
for cid, members in cluster_members.items():
    if len(members) < MIN_MEANINGFUL_CLUSTER_SIZE and cid != mainstream_cid:
        for i in range(len(repos)):
            if final_labels[i] == cid:
                final_labels[i] = mainstream_cid

rows_to_insert = [
    (repos[i], final_labels[i], cluster_id_to_name[final_labels[i]])
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