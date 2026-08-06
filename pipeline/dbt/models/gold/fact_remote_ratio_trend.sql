SELECT
    work_year,
    remote_ratio,
    COUNT(*) AS respondent_count
FROM {{ ref('silver_ai_jobs_salaries') }}
GROUP BY work_year, remote_ratio