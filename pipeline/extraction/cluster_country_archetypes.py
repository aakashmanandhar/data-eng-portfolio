import psycopg2
import psycopg2.extras
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from datetime import date

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="readonly_user", password="readonlypass123",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT country_code, ai_share_pct, total_stargazers
    FROM dbt_dev_gold.fact_country_ai_signal
""")
rows = cur.fetchall()
cur.close()
conn.close()

if len(rows) < 4:
    print("Not enough countries to cluster meaningfully. Skipping.")
    exit(0)

# Features: AI-share % (already 0-1) and log-scaled total activity (huge range, so log-transform)
X = np.array([[r["ai_share_pct"], np.log10(r["total_stargazers"] + 1)] for r in rows])
X_scaled = StandardScaler().fit_transform(X)

k = min(4, len(rows))  # up to 4 archetypes, fewer if not enough countries yet
kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
labels = kmeans.fit_predict(X_scaled)

# Name each cluster based on its centroid's actual characteristics, not an arbitrary index
cluster_stats = {}
for i in range(k):
    mask = labels == i
    avg_ai_share = np.mean([rows[j]["ai_share_pct"] for j in range(len(rows)) if mask[j]])
    avg_volume = np.mean([rows[j]["total_stargazers"] for j in range(len(rows)) if mask[j]])
    cluster_stats[i] = {"avg_ai_share": avg_ai_share, "avg_volume": avg_volume}

# Rank clusters by AI-share to assign meaningful names
sorted_clusters = sorted(cluster_stats.items(), key=lambda x: x[1]["avg_ai_share"], reverse=True)
archetype_names = ["AI-Leaning Hub", "Balanced Tech Hub", "Traditional-Leaning Hub", "Emerging Market"]
cluster_to_name = {cluster_id: archetype_names[rank] for rank, (cluster_id, _) in enumerate(sorted_clusters) if rank < len(archetype_names)}

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("TRUNCATE dbt_dev_gold.dim_country_archetype;")

for i, row in enumerate(rows):
    cluster_id = int(labels[i])
    archetype = cluster_to_name.get(cluster_id, f"Cluster {cluster_id}")
    cur.execute("""
        INSERT INTO dbt_dev_gold.dim_country_archetype (country_code, archetype, ai_share_pct, total_stargazers, generated_at)
        VALUES (%s, %s, %s, %s, %s)
    """, (row["country_code"], archetype, row["ai_share_pct"], row["total_stargazers"], date.today()))

conn.commit()
cur.close()
conn.close()

print(f"Clustered {len(rows)} countries into {k} archetypes:")
for cluster_id, name in cluster_to_name.items():
    stats = cluster_stats[cluster_id]
    print(f"  {name}: avg AI-share {stats['avg_ai_share']*100:.1f}%, avg volume {stats['avg_volume']:.0f}")