{{ config(materialized='table') }}
SELECT 1 AS source_id, 'arxiv' AS source_name, 'research' AS source_type
UNION ALL
SELECT 2, 'github', 'code'
UNION ALL
SELECT 3, 'hackernews', 'discussion'
