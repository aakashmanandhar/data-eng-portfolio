SELECT
    repo_full_name,
    cohort,
    (raw_data->>'stars')::INTEGER AS stars,
    (raw_data->>'forks')::INTEGER AS forks,
    (raw_data->>'open_issues')::INTEGER AS open_issues,
    (raw_data->>'contributor_count')::INTEGER AS contributor_count,
    raw_data->>'language' AS language,
    (raw_data->>'created_at')::TIMESTAMPTZ AS repo_created_at,
    (raw_data->>'pushed_at')::TIMESTAMPTZ AS repo_pushed_at,
    raw_data->>'description' AS description,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'github_repo_snapshot') }}