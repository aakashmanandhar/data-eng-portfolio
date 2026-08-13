{{ config(materialized='table') }}

select
    row_number() over (order by source_domain) as source_id,
    source_domain,
    'news' as source_type
from (
    select distinct source_domain
    from {{ ref('silver_news_articles') }}
    where source_domain is not null
) t