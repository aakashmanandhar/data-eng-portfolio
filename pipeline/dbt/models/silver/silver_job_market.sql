SELECT
    country_code,
    seniority_level,
    raw_data->>'search_title' AS search_title,
    (raw_data->>'job_count')::INTEGER AS job_count,
    (raw_data->>'avg_salary_estimate')::NUMERIC AS avg_salary_estimate,
    loaded_at
FROM {{ source('bronze', 'adzuna_job_market') }}