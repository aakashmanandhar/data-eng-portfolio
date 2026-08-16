{{ config(materialized='table') }}
WITH deduped AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY tool_name, snapshot_date ORDER BY loaded_at DESC) AS rn
    FROM {{ ref('silver_pypi_trends') }}
),
ranked AS (
    SELECT
        tool_name,
        last_month_downloads,
        snapshot_date,
        LAG(last_month_downloads) OVER (PARTITION BY tool_name ORDER BY snapshot_date) AS prev_month_downloads
    FROM deduped
    WHERE rn = 1
)
SELECT
    tool_name,
    last_month_downloads,
    snapshot_date,
    prev_month_downloads,
    CASE WHEN prev_month_downloads IS NOT NULL AND prev_month_downloads > 0
         THEN ROUND(((last_month_downloads - prev_month_downloads)::NUMERIC / prev_month_downloads) * 100, 2)
         ELSE NULL END AS growth_pct
FROM ranked
