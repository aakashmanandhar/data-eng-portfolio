WITH ranked AS (
    SELECT
        work_year,
        job_title,
        COUNT(*) AS respondent_count,
        AVG(salary_in_usd) AS avg_salary_usd,
        ROW_NUMBER() OVER (PARTITION BY work_year ORDER BY AVG(salary_in_usd) DESC) AS rn
    FROM {{ ref('silver_ai_jobs_salaries') }}
    GROUP BY work_year, job_title
    HAVING COUNT(*) >= 20
)
SELECT work_year, job_title, respondent_count, avg_salary_usd
FROM ranked
WHERE rn = 1