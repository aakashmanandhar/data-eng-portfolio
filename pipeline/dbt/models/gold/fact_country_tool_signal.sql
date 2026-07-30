-- [GIS] Per-repo, per-country signal — powers the "re-shade map to one tool" feature.
SELECT
    repo_full_name,
    cohort,
    country_code,
    stargazers,
    percentage,
    snapshot_date
FROM {{ ref('silver_oss_insight_stargazers') }}
ORDER BY stargazers DESC