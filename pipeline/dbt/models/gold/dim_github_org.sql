WITH latest AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY org_name ORDER BY snapshot_date DESC, loaded_at DESC) AS rn
    FROM {{ ref('silver_github_org_snapshot') }}
)

SELECT
    org_name,
    total_public_repos,
    aggregate_stars,
    aggregate_forks,
    top_repos,
    snapshot_date AS latest_snapshot_date
FROM latest
WHERE rn = 1