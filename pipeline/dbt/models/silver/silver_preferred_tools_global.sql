SELECT
    tool_entry->>0 AS tool_name,
    (tool_entry->>1)::INTEGER AS preference_count
FROM {{ source('bronze', 'so_survey_preferred_global') }},
LATERAL jsonb_array_elements(raw_data) AS tool_entry