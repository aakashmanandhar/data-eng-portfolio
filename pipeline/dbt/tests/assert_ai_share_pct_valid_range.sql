-- [GIS] Fails if any ai_share_pct falls outside the valid 0-1 range
SELECT *
FROM {{ ref('fact_country_ai_signal') }}
WHERE ai_share_pct < 0 OR ai_share_pct > 1