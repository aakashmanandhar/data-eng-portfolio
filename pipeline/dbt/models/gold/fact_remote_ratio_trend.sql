SELECT
    work_year,
    remote_ratio,
    COUNT(*) AS respondent_count
FROM {{ ref('silver_ai_jobs_salaries') }}
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM {{ ref('silver_ai_jobs_salaries') }})
GROUP BY work_year, remote_ratio