-- [SO-HIST] Unnests languages_used/databases_used/platforms_used into one
-- long-format row per (respondent, year, tool), enforcing the DE/AI-DE
-- theme filter structurally via INNER JOIN against the tool crosswalk
-- (anything not in that seed simply never matches, no separate WHERE
-- needed), and resolving country name variants via the country crosswalk.
-- Some years store these array fields as JSON null rather than an empty
-- array (e.g. 2016's databases_used) - jsonb_array_elements_text errors
-- on a scalar null, so each unnest is guarded with a jsonb_typeof check.
WITH source AS (
    SELECT
        survey_year,
        raw_data ->> 'country' AS raw_country,
        raw_data ->> 'devtype' AS devtype,
        raw_data -> 'languages_used' AS languages_used,
        raw_data -> 'databases_used' AS databases_used,
        raw_data -> 'platforms_used' AS platforms_used,
        raw_data ->> 'comp_yearly_raw' AS comp_yearly_raw,
        (raw_data ->> 'ai_tool_used')::boolean AS ai_tool_used
    FROM {{ source('bronze', 'so_survey_historical') }}
),
country_resolved AS (
    SELECT
        s.*,
        CASE WHEN cw.exclude THEN NULL ELSE COALESCE(cw.canonical_country, s.raw_country) END AS country
    FROM source s
    LEFT JOIN {{ ref('so_survey_country_crosswalk') }} cw ON cw.raw_country = s.raw_country
),
unnested_tools AS (
    SELECT survey_year, country, devtype, comp_yearly_raw, ai_tool_used, tool, 'language' AS field_source
    FROM country_resolved,
    LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(languages_used) = 'array' THEN languages_used ELSE '[]'::jsonb END
    ) AS tool
    UNION ALL
    SELECT survey_year, country, devtype, comp_yearly_raw, ai_tool_used, tool, 'database'
    FROM country_resolved,
    LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(databases_used) = 'array' THEN databases_used ELSE '[]'::jsonb END
    ) AS tool
    UNION ALL
    SELECT survey_year, country, devtype, comp_yearly_raw, ai_tool_used, tool, 'platform'
    FROM country_resolved,
    LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(platforms_used) = 'array' THEN platforms_used ELSE '[]'::jsonb END
    ) AS tool
)
SELECT
    ut.survey_year,
    ut.country,
    ut.devtype,
    ut.comp_yearly_raw,
    ut.ai_tool_used,
    cw.canonical_tool,
    cw.tool_category
FROM unnested_tools ut
INNER JOIN {{ ref('so_survey_tool_crosswalk') }} cw ON cw.raw_tool = ut.tool
WHERE ut.country IS NOT NULL