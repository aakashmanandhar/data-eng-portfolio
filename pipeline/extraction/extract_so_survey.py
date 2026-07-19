import csv
import json
from collections import defaultdict

csv.field_size_limit(10_000_000)

INPUT_PATH = "data/so_survey_2025.csv"
OUTPUT_PATH = "so_survey_extracted.json"
MIN_RESPONSES_PER_COUNTRY = 20  # statistical reliability threshold

country_tool_counts = defaultdict(lambda: defaultdict(int))
country_respondent_counts = defaultdict(int)
country_salaries = defaultdict(list)

with open(INPUT_PATH) as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get('DevType') != 'Data engineer':
            continue

        country = row.get('Country', '').strip()
        if not country or country == 'NA':
            continue

        country_respondent_counts[country] += 1

        # Combine tools across languages, databases, and platforms
        for field in ['LanguageHaveWorkedWith', 'DatabaseHaveWorkedWith', 'PlatformHaveWorkedWith']:
            raw = row.get(field, '')
            if raw:
                for tool in raw.split(';'):
                    tool = tool.strip()
                    if tool and tool != 'NA':
                        country_tool_counts[country][tool] += 1

        comp = row.get('ConvertedCompYearly', '')
        if comp and comp.replace('.', '', 1).isdigit():
            country_salaries[country].append(float(comp))

# Build final output, applying the minimum-sample-size threshold
output = {}
for country, respondent_count in country_respondent_counts.items():
    if respondent_count < MIN_RESPONSES_PER_COUNTRY:
        continue  # not enough data for statistical reliability

    top_tools = sorted(country_tool_counts[country].items(), key=lambda x: -x[1])[:10]
    salaries = country_salaries[country]
    avg_salary = round(sum(salaries) / len(salaries)) if salaries else None

    output[country] = {
        "respondent_count": respondent_count,
        "top_tools": top_tools,
        "avg_salary_usd": avg_salary,
        "salary_sample_size": len(salaries),
    }

with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, indent=2)

print(f"Processed. {len(output)} countries meet the {MIN_RESPONSES_PER_COUNTRY}+ response threshold.")
print(f"Countries excluded (insufficient data): {len(country_respondent_counts) - len(output)}")
print(f"Saved to {OUTPUT_PATH}")