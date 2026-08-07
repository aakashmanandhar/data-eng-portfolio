import psycopg2
import psycopg2.extras
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

SIZE_SCORE = {"S": 1, "M": 2, "L": 3}
MIN_RESPONDENTS = 100

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
    SELECT job_title, salary_in_usd, remote_ratio, company_size
    FROM dbt_dev_silver.silver_ai_jobs_salaries
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM dbt_dev_silver.silver_ai_jobs_salaries)
""")
rows = cur.fetchall()
cur.close()
conn.close()

by_title = {}
for r in rows:
    by_title.setdefault(r["job_title"], []).append(r)

titles = []
features = []
raw_stats = {}
for title, respondents in by_title.items():
    if len(respondents) < MIN_RESPONDENTS:
        continue
    median_salary = float(np.median([r["salary_in_usd"] for r in respondents]))
    avg_remote = float(np.mean([r["remote_ratio"] for r in respondents]))
    avg_size_score = float(np.mean([SIZE_SCORE.get(r["company_size"], 2) for r in respondents]))
    titles.append(title)
    features.append([median_salary, avg_remote, avg_size_score])
    raw_stats[title] = {"median_salary": median_salary, "avg_remote": avg_remote,
                         "avg_size_score": avg_size_score, "respondent_count": len(respondents)}

X = StandardScaler().fit_transform(np.array(features))
k = 4
kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
labels = kmeans.fit_predict(X)

cluster_members = {}
for i, title in enumerate(titles):
    cluster_members.setdefault(int(labels[i]), []).append(title)

# Name clusters by real centroid characteristics (salary + remote + size), not positional ID -
# same lesson learned from the tool co-adoption clustering instability earlier this project.
cluster_profiles = {}
for cid, members in cluster_members.items():
    salaries = [raw_stats[m]["median_salary"] for m in members]
    remotes = [raw_stats[m]["avg_remote"] for m in members]
    sizes = [raw_stats[m]["avg_size_score"] for m in members]
    cluster_profiles[cid] = {
        "avg_salary": np.mean(salaries), "avg_remote": np.mean(remotes), "avg_size": np.mean(sizes),
    }

overall_avg_remote = np.mean([p["avg_remote"] for p in cluster_profiles.values()])

# Rank by salary (guaranteed unique 1st-4th, unlike a binary above/below-average
# threshold which can collide when 2+ real clusters land in the same quadrant)
salary_ranked = sorted(cluster_profiles.items(), key=lambda kv: kv[1]["avg_salary"], reverse=True)
SALARY_TIER_NAMES = ["Highest-Paying", "Above-Average Pay", "Below-Average Pay", "Entry-Track"]

cluster_id_to_name = {}
for rank, (cid, profile) in enumerate(salary_ranked):
    tier = SALARY_TIER_NAMES[rank] if rank < len(SALARY_TIER_NAMES) else f"Tier {rank+1}"
    qualifier = "Remote-Friendly" if profile["avg_remote"] >= overall_avg_remote else "Onsite-Leaning"
    cluster_id_to_name[cid] = f"{tier} · {qualifier}"

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS dbt_dev_gold.career_archetype (
        job_title TEXT PRIMARY KEY,
        archetype TEXT NOT NULL,
        median_salary_usd NUMERIC,
        avg_remote_ratio NUMERIC,
        avg_company_size_score NUMERIC,
        respondent_count INTEGER,
        generated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )
""")
cur.execute("TRUNCATE TABLE dbt_dev_gold.career_archetype")
insert_rows = [
    (titles[i], cluster_id_to_name[int(labels[i])], raw_stats[titles[i]]["median_salary"],
     raw_stats[titles[i]]["avg_remote"], raw_stats[titles[i]]["avg_size_score"], raw_stats[titles[i]]["respondent_count"])
    for i in range(len(titles))
]
psycopg2.extras.execute_values(
    cur,
    """INSERT INTO dbt_dev_gold.career_archetype
       (job_title, archetype, median_salary_usd, avg_remote_ratio, avg_company_size_score, respondent_count)
       VALUES %s""",
    insert_rows,
)
conn.commit()

print(f"Total titles clustered: {len(titles)}")
for cid, name in cluster_id_to_name.items():
    members = cluster_members[cid]
    print(f"{name} ({len(members)} titles): {members[:5]}")
cur.close()
conn.close()