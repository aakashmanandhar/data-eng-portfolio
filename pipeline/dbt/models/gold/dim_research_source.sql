{{ config(materialized='table') }}
SELECT 1 AS source_id, 'arxiv' AS source_name, 'research' AS source_type
UNION ALL
SELECT 2, 'github', 'code'
UNION ALL
SELECT 3, 'hackernews', 'discussion'
UNION ALL
SELECT 4, 'semantic_scholar', 'research'
UNION ALL
SELECT 5, 'openalex', 'research'
UNION ALL
SELECT 6, 'crossref', 'research'
UNION ALL
SELECT 7, 'dblp', 'research'
UNION ALL
SELECT 8, 'hf_papers', 'research'
UNION ALL
SELECT 9, 'zenodo', 'research'
