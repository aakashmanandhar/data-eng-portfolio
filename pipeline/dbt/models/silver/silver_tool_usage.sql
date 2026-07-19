SELECT
    country,
    (raw_data->>'respondent_count')::INTEGER AS respondent_count,
    tool_entry->>0 AS tool_name,
    (tool_entry->>1)::INTEGER AS usage_count,
    (raw_data->>'avg_salary_usd')::NUMERIC AS avg_salary_usd,
    (raw_data->>'salary_sample_size')::INTEGER AS salary_sample_size,
    loaded_at
FROM {{ source('bronze', 'so_survey_by_country') }},
LATERAL jsonb_array_elements(raw_data->'top_tools') AS tool_entry