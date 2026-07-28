WITH deduped AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY repo_full_name, snapshot_date ORDER BY loaded_at DESC) AS rn
    FROM {{ ref('silver_github_repo_snapshot') }}
),

ranked AS (
    SELECT
        repo_full_name,
        cohort,
        language,
        stars,
        forks,
        open_issues,
        snapshot_date,
        LAG(stars) OVER (PARTITION BY repo_full_name ORDER BY snapshot_date) AS prev_stars
    FROM deduped
    WHERE rn = 1
)

SELECT
    repo_full_name,
    cohort,
    language,
    stars,
    forks,
    open_issues,
    snapshot_date,
    prev_stars,
    CASE WHEN prev_stars IS NOT NULL THEN stars - prev_stars ELSE NULL END AS star_growth,
    CASE WHEN prev_stars IS NOT NULL AND prev_stars > 0
         THEN ROUND(((stars - prev_stars)::NUMERIC / prev_stars) * 100, 2)
         ELSE NULL END AS star_growth_pct
FROM ranked