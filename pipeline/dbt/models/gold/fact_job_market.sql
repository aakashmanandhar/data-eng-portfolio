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
)

SELECT
    a.country_name,
    a.seniority_level,
    a.job_count,
    a.salary_usd AS adzuna_salary_usd,
    s.avg_salary_usd AS so_survey_salary_usd,
    s.salary_sample_size AS so_survey_sample_size
FROM adzuna a
LEFT JOIN so_salary s ON s.country_name = a.country_name