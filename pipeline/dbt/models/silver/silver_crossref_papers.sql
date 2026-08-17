SELECT
    external_id,
    raw_data->>'title' AS title,
    raw_data->>'summary' AS summary,
    raw_data->>'url' AS url,
    raw_data->>'authors' AS authors,
    (raw_data->>'score')::INTEGER AS score,
    (raw_data->>'published_at')::TIMESTAMPTZ AS published_at,
    snapshot_date,
    loaded_at
FROM {{ source('bronze', 'crossref_papers') }}
WHERE (raw_data->>'published_at')::TIMESTAMPTZ <= now() + INTERVAL '2 years'
