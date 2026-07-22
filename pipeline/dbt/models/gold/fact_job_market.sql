WITH adzuna AS (
    SELECT
        cm.country_name,
        j.seniority_level,
        j.job_count,
        j.avg_salary_estimate AS salary_usd
    FROM {{ ref('silver_job_market') }} j
    JOIN {{ ref('country_mapping') }} cm ON cm.country_code = j.country_code
),

so_salary AS (
    SELECT DISTINCT
        country AS country_name,
        avg_salary_usd,
        salary_sample_size
    FROM {{ ref('silver_tool_usage') }}
),

jooble_normalized AS (
    -- Normalize Jooble's casual country names to match dim_country's formal names
    SELECT
        CASE
            WHEN country = 'United States' THEN 'United States of America'
            WHEN country = 'United Kingdom' THEN 'United Kingdom of Great Britain and Northern Ireland'
            ELSE country
        END AS country_name,
        job_count AS jooble_job_count
    FROM {{ ref('silver_jooble_job_market') }}
    WHERE job_count > 0
),

combined AS (
    -- Adzuna countries (with seniority breakdown)
    SELECT country_name, seniority_level, job_count, salary_usd
    FROM adzuna

    UNION ALL

    -- Jooble-only countries not already covered by Adzuna (no seniority breakdown available)
    SELECT j.country_name, 'all' AS seniority_level, NULL AS job_count, NULL AS salary_usd    
    FROM jooble_normalized j
    WHERE NOT EXISTS (
        SELECT 1 FROM adzuna a WHERE a.country_name = j.country_name
    )
)

SELECT
    c.country_name,
    c.seniority_level,
    COALESCE(c.job_count, 0) AS job_count,
    c.salary_usd AS adzuna_salary_usd,
    s.avg_salary_usd AS so_survey_salary_usd,
    s.salary_sample_size AS so_survey_sample_size,
    j.jooble_job_count
FROM combined c
LEFT JOIN so_salary s ON s.country_name = c.country_name
LEFT JOIN jooble_normalized j ON j.country_name = c.country_name