{{ config(materialized='table') }}

with source as (
    select
        raw_data,
        snapshot_date
    from {{ source('bronze', 'news_articles_snapshot') }}
    where snapshot_date = (select max(snapshot_date) from {{ source('bronze', 'news_articles_snapshot') }})
),

typed as (
    select
        raw_data->>'id' as article_id,
        raw_data->>'title' as title,
        raw_data->>'description' as description,
        raw_data->>'url' as url,
        regexp_replace(raw_data->>'url', '^https?://(www\.)?([^/]+).*$', '\2') as source_domain,
        nullif(raw_data->>'author', '') as author,
        raw_data->>'language' as language,
        raw_data->'category'->>0 as category,
        raw_data->>'_matched_keyword' as matched_keyword,
        (raw_data->>'published')::timestamptz as published_at,
        snapshot_date
    from source
)

select distinct on (article_id) *
from typed
where article_id is not null
order by article_id, published_at desc