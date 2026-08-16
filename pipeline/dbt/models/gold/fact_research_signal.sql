{{ config(materialized='table') }}
WITH unioned AS (
    SELECT
        external_id,
        title,
        url,
        NULL AS topic_tags,
        0 AS score,
        published_at,
        'arxiv' AS source_name
    FROM {{ ref('silver_research_papers') }}

    UNION ALL

    SELECT
        external_id,
        title,
        url,
        topic_tags,
        score,
        published_at,
        'github' AS source_name
    FROM {{ ref('silver_research_repos') }}

    UNION ALL

    SELECT
        external_id,
        title,
        url,
        topic_tags,
        score,
        published_at,
        'hackernews' AS source_name
    FROM {{ ref('silver_research_hn') }}
)
SELECT
    u.external_id,
    u.title,
    u.url,
    u.topic_tags,
    u.score,
    u.published_at,
    s.source_id,
    s.source_name
FROM unioned u
JOIN {{ ref('dim_research_source') }} s ON s.source_name = u.source_name
