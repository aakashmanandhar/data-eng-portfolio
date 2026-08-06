import csv
import io
import json
import time
import requests

SOURCE_URL = "https://raw.githubusercontent.com/foorilla/ai-jobs-net-salaries/main/salaries.csv"


def fetch_salaries_csv(max_retries=3):
    for attempt in range(max_retries):
        try:
            resp = requests.get(SOURCE_URL, timeout=30)
            if resp.status_code == 200:
                return resp.text
            print(f"  Unexpected status {resp.status_code}, attempt {attempt + 1}/{max_retries}")
        except requests.exceptions.RequestException as e:
            print(f"  Attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(2)
    return None


print(f"Fetching {SOURCE_URL}...")
csv_text = fetch_salaries_csv()

if csv_text is None:
    raise SystemExit("Failed to fetch salaries.csv after retries")

reader = csv.DictReader(io.StringIO(csv_text))
rows = list(reader)

print(f"  Parsed {len(rows)} rows, columns: {reader.fieldnames}")

with open("ai_jobs_salaries_raw_output.json", "w") as f:
    json.dump(rows, f, indent=2)

print(f"\nDone. Saved {len(rows)} rows to ai_jobs_salaries_raw_output.json")
