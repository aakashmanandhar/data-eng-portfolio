WITH ranked AS (
    SELECT
        org_name,
        total_public_repos,
        aggregate_stars,
        aggregate_forks,
        top_repos,
        snapshot_date,
        LAG(aggregate_stars) OVER (PARTITION BY org_name ORDER BY snapshot_date, loaded_at) AS prev_stars
    FROM {{ ref('silver_github_org_snapshot') }}
)

SELECT
    org_name,
    total_public_repos,
    aggregate_stars,
    aggregate_forks,
    top_repos,
    snapshot_date,
    prev_stars,
    CASE WHEN prev_stars IS NOT NULL THEN aggregate_stars - prev_stars ELSE NULL END AS star_growth,
    CASE WHEN prev_stars IS NOT NULL AND prev_stars > 0
         THEN ROUND(((aggregate_stars - prev_stars)::NUMERIC / prev_stars) * 100, 2)
         ELSE NULL END AS star_growth_pct
FROM ranked