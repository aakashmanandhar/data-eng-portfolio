SELECT
    work_year,
    experience_level,
    COUNT(*) AS respondent_count,
    AVG(salary_in_usd) AS avg_salary_usd,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary_in_usd) AS median_salary_usd
FROM {{ ref('silver_ai_jobs_salaries') }}
GROUP BY work_year, experience_level