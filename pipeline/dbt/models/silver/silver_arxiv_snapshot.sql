SELECT
    cohort,
    (raw_data->>'total_papers')::INTEGER AS total_papers,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'arxiv_snapshot') }}