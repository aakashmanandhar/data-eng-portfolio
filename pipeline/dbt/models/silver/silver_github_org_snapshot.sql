SELECT
    org_name,
    (raw_data->>'total_public_repos')::INTEGER AS total_public_repos,
    (raw_data->>'aggregate_stars')::INTEGER AS aggregate_stars,
    (raw_data->>'aggregate_forks')::INTEGER AS aggregate_forks,
    raw_data->'top_repos' AS top_repos,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'github_org_snapshot') }}