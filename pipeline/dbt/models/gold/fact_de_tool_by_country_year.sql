-- [SO-HIST] Gold: per-country, per-year tool usage %, correctly computed
-- against the real respondent denominator (not a share of tool mentions,
-- which would understate adoption since most respondents use several tools).
WITH country_totals AS (
    SELECT
        survey_year,
        CASE WHEN cw.exclude THEN NULL ELSE COALESCE(cw.canonical_country, raw_data ->> 'country') END AS country,
        COUNT(*) AS total_respondents
    FROM {{ source('bronze', 'so_survey_historical') }} b
    LEFT JOIN {{ ref('so_survey_country_crosswalk') }} cw ON cw.raw_country = b.raw_data ->> 'country'
    GROUP BY 1, 2
),
tool_counts AS (
    SELECT
        survey_year,
        country,
        canonical_tool,
        tool_category,
        COUNT(*) AS respondent_count
    FROM {{ ref('silver_so_survey_historical') }}
    GROUP BY 1, 2, 3, 4
)
SELECT
    tc.survey_year,
    tc.country,
    tc.canonical_tool,
    tc.tool_category,
    tc.respondent_count,
    ct.total_respondents,
    ROUND(tc.respondent_count::numeric / NULLIF(ct.total_respondents, 0), 4) AS usage_pct
FROM tool_counts tc
INNER JOIN country_totals ct ON ct.survey_year = tc.survey_year AND ct.country = tc.country
WHERE tc.country IS NOT NULL