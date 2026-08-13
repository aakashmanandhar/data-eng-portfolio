{{ config(materialized='table') }}

select
    dk.keyword_id,
    ds.source_id,
    date(a.published_at) as mention_date,
    count(*) as mention_count
from {{ ref('silver_news_articles') }} a
join {{ ref('dim_keyword') }} dk on a.matched_keyword = dk.keyword
join {{ ref('dim_source') }} ds on a.source_domain = ds.source_domain
group by dk.keyword_id, ds.source_id, date(a.published_at)