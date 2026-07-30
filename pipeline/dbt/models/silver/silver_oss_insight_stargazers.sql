-- [GIS] Flattens OSS Insight's nested country-breakdown JSON into one row
-- per repo per country, typed and ready for gold-layer aggregation.
WITH source AS (
    SELECT
        repo_full_name,
        raw_data ->> 'cohort' AS cohort,
        raw_data -> 'data' -> 'data' -> 'rows' AS country_rows,
        snapshot_date,
        loaded_at
    FROM {{ source('bronze', 'oss_insight_stargazers') }}
)

SELECT
    s.repo_full_name,
    s.cohort,
    s.snapshot_date,
    s.loaded_at,
    country_row.value ->> 'country_code' AS country_code,
    (country_row.value ->> 'stargazers')::INTEGER AS stargazers,
    (country_row.value ->> 'percentage')::NUMERIC AS percentage
FROM source s,
LATERAL jsonb_array_elements(s.country_rows) AS country_row
WHERE s.country_rows IS NOT NULL