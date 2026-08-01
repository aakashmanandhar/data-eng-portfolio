"""
[PDC] K-means clustering of Practical Data Community survey respondents into
organizational maturity archetypes. org_size and ai_adoption are ordinal
(natural order preserved as a maturity scale); architecture_trend and
orchestration are one-hot (no inherent order), each with their long tail of
one-off write-in answers bucketed into "Other" first.
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
    SELECT respondent_id, org_size, architecture_trend, ai_adoption, orchestration
    FROM dbt_dev_silver.silver_practical_data_survey
    WHERE org_size IS NOT NULL AND architecture_trend IS NOT NULL
      AND ai_adoption IS NOT NULL AND orchestration IS NOT NULL
""")
rows = cur.fetchall()

ORG_SIZE_ORDER = {"< 50 employees": 1, "50–199": 2, "200–999": 3, "1,000–10,000": 4, "10,000+": 5}
AI_ADOPTION_ORDER = {
    "No meaningful adoption yet": 0, "Experimenting": 1,
    "Using AI for tactical tasks": 2, "Building internal AI platforms": 3,
    "AI embedded in most workflows": 4,
}
ARCHITECTURE_TOP = {"Centralized warehouse", "Lakehouse", "Data mesh / federated ownership", "Event-driven architecture"}
ORCHESTRATION_TOP = {"Cloud-native (GCP Cloud Composer, AWS MWAA, etc.)", "Airflow", "No orchestration / ad-hoc", "Dagster"}

respondent_ids = []
org_size_ord = []
ai_adoption_ord = []
architecture_bucketed = []
orchestration_bucketed = []

for rid, org_size, architecture_trend, ai_adoption, orchestration in rows:
    respondent_ids.append(rid)
    org_size_ord.append(ORG_SIZE_ORDER.get(org_size, 3))  # default to mid-size if unmapped
    ai_adoption_ord.append(AI_ADOPTION_ORDER.get(ai_adoption, 1))
    architecture_bucketed.append(architecture_trend if architecture_trend in ARCHITECTURE_TOP else "Other")
    orchestration_bucketed.append(orchestration if orchestration in ORCHESTRATION_TOP else "Other")

architecture_categories = sorted(set(architecture_bucketed))
orchestration_categories = sorted(set(orchestration_bucketed))

features = []
for i in range(len(respondent_ids)):
    row = [org_size_ord[i], ai_adoption_ord[i]]
    row += [1.0 if architecture_bucketed[i] == cat else 0.0 for cat in architecture_categories]
    row += [1.0 if orchestration_bucketed[i] == cat else 0.0 for cat in orchestration_categories]
    features.append(row)

X = np.array(features)
X_scaled = StandardScaler().fit_transform(X)

K = 4
model = KMeans(n_clusters=K, random_state=42, n_init=10)
cluster_labels = model.fit_predict(X_scaled)

# Print each cluster's real characteristics so we can name them meaningfully
# afterward, based on actual centroids rather than a pre-assumed label.
print(f"\n{'='*60}\nCluster profiles ({len(respondent_ids)} respondents total):\n{'='*60}")
for c in range(K):
    mask = cluster_labels == c
    count = mask.sum()
    avg_org_size = np.array(org_size_ord)[mask].mean()
    avg_ai_adoption = np.array(ai_adoption_ord)[mask].mean()
    top_architecture = max(set(np.array(architecture_bucketed)[mask]), key=lambda v: (np.array(architecture_bucketed)[mask] == v).sum())
    top_orchestration = max(set(np.array(orchestration_bucketed)[mask]), key=lambda v: (np.array(orchestration_bucketed)[mask] == v).sum())
    print(f"\nCluster {c}: {count} respondents")
    print(f"  avg org_size (1-5 scale): {avg_org_size:.2f}")
    print(f"  avg ai_adoption (0-4 scale): {avg_ai_adoption:.2f}")
    print(f"  most common architecture: {top_architecture}")
    print(f"  most common orchestration: {top_orchestration}")

# Write raw cluster assignment now - archetype NAMES get added in a
# follow-up update once we've inspected real centroids together.
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.org_maturity_archetype (
        respondent_id INTEGER PRIMARY KEY,
        cluster_id INTEGER NOT NULL,
        archetype_name TEXT,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.org_maturity_archetype")
# Names assigned after inspecting real cluster centroids (see printed
# profiles above) - the split is driven mainly by orchestration/architecture
# choice, not a clean AI-maturity gradient (avg org_size and ai_adoption
# barely differ across clusters), so archetypes are named honestly by
# tooling philosophy rather than a forced "maturity ladder" narrative.
ARCHETYPE_NAMES = {
    0: "Cloud-Native Lakehouse Teams",
    1: "Ad-Hoc Warehouse Teams",
    2: "Airflow-Orchestrated Warehouse Teams",
    3: "Custom-Tooling Warehouse Teams",
}
rows_to_insert = [
    (respondent_ids[i], int(cluster_labels[i]), ARCHETYPE_NAMES.get(int(cluster_labels[i])))
    for i in range(len(respondent_ids))
]
execute_values(
    cur, "INSERT INTO dbt_dev_gold.org_maturity_archetype (respondent_id, cluster_id, archetype_name) VALUES %s",
    rows_to_insert,
)
conn.commit()
print(f"\nWrote {len(rows_to_insert)} cluster assignments to dbt_dev_gold.org_maturity_archetype")
cur.close()
conn.close()