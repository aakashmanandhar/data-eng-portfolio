{{ config(materialized='table') }}

with scored as (
    select
        keyword_id,
        date(published_at) as sentiment_date,
        case
            when sentiment_label = 'positive' then 1
            when sentiment_label = 'negative' then -1
            else 0
        end as sentiment_numeric,
        sentiment_score as confidence
    from {{ source('gold_python', 'news_article_sentiment') }}
)

select
    keyword_id,
    sentiment_date,
    count(*) as mention_count,
    round(avg(confidence)::numeric, 3) as avg_confidence,
    -- confidence-weighted average: a high-confidence label pulls the
    -- daily sentiment more than a low-confidence one, rather than
    -- treating every label as equally certain
    round((sum(sentiment_numeric * confidence) / nullif(sum(confidence), 0))::numeric, 3) as weighted_sentiment
from scored
group by keyword_id, sentiment_date