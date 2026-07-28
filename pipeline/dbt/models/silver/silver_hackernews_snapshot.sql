SELECT
    cohort,
    (raw_data->>'total_stories')::INTEGER AS total_stories,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'hackernews_snapshot') }}