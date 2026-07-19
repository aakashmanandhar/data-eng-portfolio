SELECT
    tool_name,
    preference_count
FROM {{ ref('silver_preferred_tools_global') }}
ORDER BY preference_count DESC