{{ config(materialized='table') }}
SELECT DISTINCT topic_tags AS topic_name
FROM {{ ref('silver_research_repos') }}
WHERE topic_tags IS NOT NULL
UNION
SELECT DISTINCT topic_tags AS topic_name
FROM {{ ref('silver_research_hn') }}
WHERE topic_tags IS NOT NULL
