SELECT
    external_id,
    raw_data->>'title' AS title,
    raw_data->>'url' AS url,
    raw_data->>'topic_tags' AS topic_tags,
    (raw_data->>'score')::INTEGER AS score,
    (raw_data->>'published_at')::TIMESTAMPTZ AS published_at,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'research_hn') }}
