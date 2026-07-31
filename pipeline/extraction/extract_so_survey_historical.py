"""
[SO-HIST] Extracts and harmonizes 10 years (2016-2025) of Stack Overflow
Developer Survey CSVs into one consistent long-format structure, using the
per-year column mapping in so_survey_column_map.py.

Input:  data/so_survey_historical/{year}.csv  (one file per year, 2016-2025)
Output: so_survey_historical_extracted.json

Each output row represents one (respondent, year) pair with harmonized fields:
    year, country, devtype, languages_used (list), databases_used (list),
    platforms_used (list), comp_yearly (raw string, currency NOT normalized
    here - that's a silver-layer job), ai_tool_used (bool)

Deliberately NOT filtering to DE-specific roles/tools at this stage - bronze
should preserve everything the mapping can extract; the DE/AI-DE theme filter
is applied downstream in silver, so the filtering logic lives in one place
(dbt) rather than being duplicated between extraction and transformation.
"""
import csv
import json
import os
import sys

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

from so_survey_column_map import YEAR_COLUMN_MAP, EXCLUDED_YEARS

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "so_survey_historical")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "so_survey_historical_extracted.json")

NA_VALUES = {"", "NA"}

def clean_scalar(raw_value):
    """Normalizes a single-value field: '' and literal 'NA' both become
    real None, instead of passing through as a fake string value."""
    if raw_value is None:
        return None
    stripped = raw_value.strip()
    return None if stripped in NA_VALUES else stripped


def parse_multiselect(raw_value):
    """Splits a semicolon-separated multi-select field into a clean list.
    Treats '' and the literal string 'NA' as no selection at all."""
    if raw_value is None or raw_value in NA_VALUES:
        return []
    return [v.strip() for v in raw_value.split(";") if v.strip()]


def resolve_ai_usage(row, ai_field):
    """ai_field is either a single column name (str) or a list of column
    names (2025's split format). Returns True if ANY relevant column has
    a real (non-NA, non-blank) value."""
    if ai_field is None:
        return None  # not asked this year at all - distinct from "asked, answered no"
    field_names = ai_field if isinstance(ai_field, list) else [ai_field]
    for field_name in field_names:
        raw_value = row.get(field_name)
        if raw_value is not None and raw_value not in NA_VALUES:
            return True
    return False


def extract_year(year, mapping):
    csv_path = os.path.join(DATA_DIR, f"{year}.csv")
    if not os.path.exists(csv_path):
        print(f"  [{year}] SKIPPED - file not found at {csv_path}")
        return []

    records = []
    with open(csv_path, encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            country_col = mapping["country"]
            devtype_col = mapping["devtype"]
            lang_col = mapping["languages_used"]
            db_col = mapping["databases_used"]
            plat_col = mapping["platforms_used"]
            comp_col = mapping["comp_yearly"]
            ai_field = mapping["ai_tool_used"]

            record = {
                "year": year,
                "country": clean_scalar(row.get(country_col)) if country_col else None,
                "devtype": clean_scalar(row.get(devtype_col)) if devtype_col else None,
                "languages_used": parse_multiselect(row.get(lang_col)) if lang_col else [],
                "databases_used": parse_multiselect(row.get(db_col)) if db_col else [],
                "platforms_used": parse_multiselect(row.get(plat_col)) if plat_col else [],
                "comp_yearly_raw": clean_scalar(row.get(comp_col)) if comp_col else None,
                "ai_tool_used": resolve_ai_usage(row, ai_field),
            }
            records.append(record)

    print(f"  [{year}] extracted {len(records)} respondents")
    return records


def main():
    print("Excluded years (not processed):")
    for year, reason in EXCLUDED_YEARS.items():
        print(f"  [{year}] EXCLUDED - {reason}")
    print()

    all_records = []
    for year, mapping in sorted(YEAR_COLUMN_MAP.items()):
        all_records.extend(extract_year(year, mapping))

    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_records, f)

    print(f"\nTotal respondents across all years: {len(all_records)}")
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()