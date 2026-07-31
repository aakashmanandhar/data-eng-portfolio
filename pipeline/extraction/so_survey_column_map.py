"""
[SO-HIST] Per-year column mapping for the historical Stack Overflow Developer
Survey pipeline (2016-2025). This is the harmonization layer: every year names
its columns differently, so this maps each year's REAL column names (confirmed
directly against the actual downloaded CSVs) to one canonical schema.

Canonical fields every year maps into:
    country          -> raw country string (crosswalked to ISO later in dbt)
    devtype          -> raw role/occupation string (used to filter to DE-relevant roles)
    languages_used    -> raw multi-select string, semicolon-separated
    databases_used    -> raw multi-select string, semicolon-separated (None if not asked that year)
    platforms_used    -> raw multi-select string, semicolon-separated (None if not asked that year)
    comp_yearly       -> raw compensation value (currency handling varies by year, see notes)
    ai_tool_used      -> raw AI-tool-usage multi-select (None for years before 2023 - not asked)

2011-2015 deliberately excluded: header rows are literal question text with
blank multi-select columns (real answer labels live in a separate schema file
per year, if published at all) - reconstruction cost far exceeds the value for
5 years of data. Pipeline starts at 2016.
"""

YEAR_COLUMN_MAP = {
    2016: {
        "country": "country",
        "devtype": "occupation",
        "languages_used": "tech_do",       # combined tech field, not split by category
        "databases_used": None,             # not asked separately this year
        "platforms_used": None,             # not asked separately this year
        "comp_yearly": "salary_midpoint",   # bucketed range's midpoint, NOT an exact figure
        "ai_tool_used": None,
        "notes": "Special-case year: no language/database/platform split, salary is a bucket midpoint not a real number.",
    },
    2017: {
        "country": "Country",
        "devtype": "DeveloperType",
        "languages_used": "HaveWorkedLanguage",
        "databases_used": "HaveWorkedDatabase",
        "platforms_used": "HaveWorkedPlatform",
        "comp_yearly": "Salary",
        "ai_tool_used": None,
        "notes": None,
    },
    2018: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageWorkedWith",
        "databases_used": "DatabaseWorkedWith",
        "platforms_used": "PlatformWorkedWith",
        "comp_yearly": "ConvertedSalary",
        "ai_tool_used": None,  # AIDangerous/AIInteresting etc exist but are ATTITUDE questions, not usage - do not map here
        "notes": None,
    },
    2019: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageWorkedWith",
        "databases_used": "DatabaseWorkedWith",
        "platforms_used": "PlatformWorkedWith",
        "comp_yearly": "ConvertedComp",
        "ai_tool_used": None,
        "notes": None,
    },
    2020: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageWorkedWith",
        "databases_used": "DatabaseWorkedWith",
        "platforms_used": "PlatformWorkedWith",
        "comp_yearly": "ConvertedComp",
        "ai_tool_used": None,
        "notes": None,
    },
    2021: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageHaveWorkedWith",
        "databases_used": "DatabaseHaveWorkedWith",
        "platforms_used": "PlatformHaveWorkedWith",
        "comp_yearly": "ConvertedCompYearly",
        "ai_tool_used": None,
        "notes": None,
    },
    2022: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageHaveWorkedWith",
        "databases_used": "DatabaseHaveWorkedWith",
        "platforms_used": "PlatformHaveWorkedWith",
        "comp_yearly": "ConvertedCompYearly",
        "ai_tool_used": None,
        "notes": None,
    },
    2023: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageHaveWorkedWith",
        "databases_used": "DatabaseHaveWorkedWith",
        "platforms_used": "PlatformHaveWorkedWith",
        "comp_yearly": "ConvertedCompYearly",
        "ai_tool_used": "AIToolCurrently Using",  # FIRST year with real AI usage signal
        "notes": "First year with genuine AI-tool-usage data (not just attitude questions). Also has AISearchHaveWorkedWith/AIDevHaveWorkedWith as narrower alternatives.",
    },
    2024: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageHaveWorkedWith",
        "databases_used": "DatabaseHaveWorkedWith",
        "platforms_used": "PlatformHaveWorkedWith",
        "comp_yearly": "ConvertedCompYearly",
        "ai_tool_used": "AIToolCurrently Using",
        "notes": "LanguageAdmired/DatabaseAdmired/PlatformAdmired added this year (sentiment, not usage - not mapped).",
    },
    2025: {
        "country": "Country",
        "devtype": "DevType",
        "languages_used": "LanguageHaveWorkedWith",
        "databases_used": "DatabaseHaveWorkedWith",
        "platforms_used": "PlatformHaveWorkedWith",
        "comp_yearly": "ConvertedCompYearly",
        "ai_tool_used": ["AIToolCurrently mostly AI", "AIToolCurrently partially AI"],  # 2025 split usage into 5 one-hot columns; these 2 represent actual current usage (verified against real header). The 2 "Plan to..." columns are intent, not usage - excluded, same distinction as 2018's attitude-only AI columns.
        "notes": "6 variants per category now (Choice/HaveWorkedWith/WantToWorkWith/Admired/HaveEntry/WantEntry). Also has a NEW dedicated AIModelsHaveWorkedWith field for specific AI models (GPT, Claude, etc) - separate signal, not mapped here yet.",
    },
}

# Years deliberately excluded and why (kept here so the decision isn't silently lost)
EXCLUDED_YEARS = {
    2011: "Header row is literal question text; all multi-select answer columns are blank in the CSV itself.",
    2012: "Same pattern as 2011.",
    2013: "Same pattern as 2011.",
    2014: "Same pattern as 2011.",
    2015: "Header row is almost entirely blank except scattered 'Select all that apply' markers.",
}