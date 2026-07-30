WITH ai_traditional AS (
    SELECT *
    FROM {{ ref('silver_oss_insight_stargazers') }}
    WHERE cohort IN ('ai', 'traditional')
),

country_totals AS (
    SELECT
        country_code,
        snapshot_date,
        SUM(CASE WHEN cohort = 'ai' THEN stargazers ELSE 0 END) AS ai_stargazers,
        SUM(CASE WHEN cohort = 'traditional' THEN stargazers ELSE 0 END) AS traditional_stargazers
    FROM ai_traditional
    GROUP BY country_code, snapshot_date
)

SELECT
    country_code,
    snapshot_date,
    ai_stargazers,
    traditional_stargazers,
    ai_stargazers + traditional_stargazers AS total_stargazers,
    CASE WHEN (ai_stargazers + traditional_stargazers) > 0
         THEN ROUND(ai_stargazers::NUMERIC / (ai_stargazers + traditional_stargazers), 4)
         ELSE NULL END AS ai_share_pct
FROM country_totals
WHERE (ai_stargazers + traditional_stargazers) >= 500
ORDER BY total_stargazers DESC