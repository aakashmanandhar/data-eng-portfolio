{{ config(materialized='table') }}

select
    row_number() over (order by keyword) as keyword_id,
    keyword,
    category
from {{ ref('news_keyword_categories') }}