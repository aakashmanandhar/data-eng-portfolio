SELECT
    tool_name,
    (raw_data->>'last_day')::BIGINT AS last_day_downloads,
    (raw_data->>'last_week')::BIGINT AS last_week_downloads,
    (raw_data->>'last_month')::BIGINT AS last_month_downloads,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'pypi_trends') }}
