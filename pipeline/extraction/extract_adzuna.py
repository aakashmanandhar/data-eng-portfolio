import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.environ.get('ADZUNA_APP_ID')
APP_KEY = os.environ.get('ADZUNA_APP_KEY')

COUNTRIES = ['at', 'au', 'be', 'br', 'ca', 'ch', 'de', 'es', 'fr', 'gb', 'in', 'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'us', 'za']

JOB_TITLE = "data engineer"

def get_histogram(country):
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/histogram"
    params = {"app_id": APP_ID, "app_key": APP_KEY, "what": JOB_TITLE, "content-type": "application/json"}
    resp = requests.get(url, params=params, timeout=15)
    return resp.status_code, resp.json() if resp.status_code == 200 else resp.text

def get_job_count(country):
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {"app_id": APP_ID, "app_key": APP_KEY, "what": JOB_TITLE, "results_per_page": 1, "content-type": "application/json"}
    resp = requests.get(url, params=params, timeout=15)
    return resp.status_code, resp.json() if resp.status_code == 200 else resp.text

results = {}

for country in COUNTRIES:
    print(f"Fetching {country}...")
    hist_status, hist_data = get_histogram(country)
    time.sleep(1)  # be polite to the free-tier rate limit
    count_status, count_data = get_job_count(country)
    time.sleep(1)

    results[country] = {
        "histogram_status": hist_status,
        "histogram": hist_data.get("histogram") if hist_status == 200 else None,
        "count_status": count_status,
        "job_count": count_data.get("count") if count_status == 200 else None,
    }
    print(f"  {country}: histogram={hist_status}, count={count_data.get('count') if count_status == 200 else count_status}")

with open("adzuna_raw_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to adzuna_raw_output.json")