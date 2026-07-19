SELECT DISTINCT
    tool_name
FROM {{ ref('silver_tool_usage') }}
WHERE tool_name IS NOT NULL