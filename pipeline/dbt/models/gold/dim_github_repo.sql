WITH latest AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY repo_full_name ORDER BY snapshot_date DESC, loaded_at DESC) AS rn
    FROM {{ ref('silver_github_repo_snapshot') }}
)

SELECT
    repo_full_name,
    cohort,
    language,
    stars,
    forks,
    open_issues,
    contributor_count,
    repo_created_at,
    repo_pushed_at,
    description,
    snapshot_date AS latest_snapshot_date
FROM latest
WHERE rn = 1