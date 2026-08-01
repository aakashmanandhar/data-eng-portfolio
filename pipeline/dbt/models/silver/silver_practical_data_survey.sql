-- [PDC] Typed/cleaned pass over the Practical Data Community survey.
-- ai_helps_with contains one answer option with an internal comma
-- ("Writing Code (SQL, Python, etc)") which would break a naive
-- comma-split - its internal commas are temporarily swapped for a
-- placeholder before splitting, then restored inside the result.
WITH source AS (
    SELECT
        id AS respondent_id,
        raw_data ->> 'role' AS role,
        raw_data ->> 'org_size' AS org_size,
        raw_data ->> 'industry' AS industry,
        raw_data ->> 'storage_environment' AS storage_environment,
        raw_data ->> 'orchestration' AS orchestration,
        raw_data ->> 'ai_usage_frequency' AS ai_usage_frequency,
        raw_data ->> 'ai_adoption' AS ai_adoption,
        raw_data ->> 'modeling_approach' AS modeling_approach,
        raw_data ->> 'architecture_trend' AS architecture_trend,
        raw_data ->> 'biggest_bottleneck' AS biggest_bottleneck,
        raw_data ->> 'team_growth_2026' AS team_growth_2026,
        raw_data ->> 'education_topic' AS education_topic,
        raw_data ->> 'region' AS region,
        raw_data ->> 'team_focus' AS team_focus_raw,
        raw_data ->> 'ai_helps_with' AS ai_helps_with_raw,
        raw_data ->> 'modeling_pain_points' AS modeling_pain_points_raw,
        snapshot_date,
        loaded_at
    FROM {{ source('bronze', 'practical_data_survey_2026') }}
)
SELECT
    respondent_id,
    role,
    org_size,
    industry,
    storage_environment,
    orchestration,
    ai_usage_frequency,
    ai_adoption,
    modeling_approach,
    architecture_trend,
    biggest_bottleneck,
    team_growth_2026,
    education_topic,
    region,
    CASE WHEN team_focus_raw IS NOT NULL THEN string_to_array(team_focus_raw, ', ') END AS team_focus,
    CASE WHEN ai_helps_with_raw IS NOT NULL THEN (
        SELECT array_agg(REPLACE(elem, '__COMMA__', ','))
        FROM unnest(
            string_to_array(
                REPLACE(ai_helps_with_raw, 'Writing Code (SQL, Python, etc)', 'Writing Code (SQL__COMMA__ Python__COMMA__ etc)'),
                ', '
            )
        ) AS elem
    ) END AS ai_helps_with,
    CASE WHEN modeling_pain_points_raw IS NOT NULL THEN string_to_array(modeling_pain_points_raw, ', ') END AS modeling_pain_points,
    snapshot_date,
    loaded_at
FROM source