SELECT
    country,
    (raw_data->>'search_keyword') AS search_keyword,
    (raw_data->>'job_count')::INTEGER AS job_count,
    loaded_at
FROM {{ source('bronze', 'jooble_job_market') }}