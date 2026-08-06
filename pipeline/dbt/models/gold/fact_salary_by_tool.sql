SELECT
    x.canonical_tool,
    s.job_title,
    s.work_year,
    COUNT(*) AS respondent_count,
    AVG(s.salary_in_usd) AS avg_salary_usd,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.salary_in_usd) AS median_salary_usd
FROM {{ ref('silver_ai_jobs_salaries') }} s
INNER JOIN {{ ref('tool_to_job_titles_crosswalk') }} x ON x.job_title = s.job_title
GROUP BY x.canonical_tool, s.job_title, s.work_year