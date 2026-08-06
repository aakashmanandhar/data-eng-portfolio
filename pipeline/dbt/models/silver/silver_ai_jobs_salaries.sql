SELECT
    id,
    (raw_data->>'work_year')::int AS work_year,
    (raw_data->>'experience_level') AS experience_level,
    (raw_data->>'employment_type') AS employment_type,
    (raw_data->>'job_title') AS job_title,
    (raw_data->>'salary')::numeric AS salary,
    (raw_data->>'salary_currency') AS salary_currency,
    (raw_data->>'salary_in_usd')::numeric AS salary_in_usd,
    (raw_data->>'employee_residence') AS employee_residence,
    (raw_data->>'remote_ratio')::int AS remote_ratio,
    (raw_data->>'company_location') AS company_location,
    (raw_data->>'company_size') AS company_size,
    snapshot_date
FROM {{ source('bronze', 'ai_jobs_salaries_snapshot') }}