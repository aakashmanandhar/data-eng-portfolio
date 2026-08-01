-- [SO-HIST] Gold: ranks tools within each (country, year) and separately
-- overall (across all countries, per year) by usage_pct - the final
-- "top DE tool" deliverable this pipeline was built for.
WITH with_overall_totals AS (
    SELECT
        *,
        SUM(respondent_count) OVER (PARTITION BY survey_year, canonical_tool, tool_category) AS overall_respondent_count
    FROM {{ ref('fact_de_tool_by_country_year') }}
)
SELECT
    survey_year,
    country,
    canonical_tool,
    tool_category,
    respondent_count,
    total_respondents,
    usage_pct,
    overall_respondent_count,
    RANK() OVER (PARTITION BY survey_year, country ORDER BY usage_pct DESC) AS rank_in_country,
    RANK() OVER (PARTITION BY survey_year, tool_category ORDER BY overall_respondent_count DESC) AS rank_overall
FROM with_overall_totals