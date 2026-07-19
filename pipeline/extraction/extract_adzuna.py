import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.environ.get('ADZUNA_APP_ID')
APP_KEY = os.environ.get('ADZUNA_APP_KEY')

COUNTRIES = ['at', 'au', 'be', 'br', 'ca', 'ch', 'de', 'es', 'fr', 'gb', 'in', 'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'us', 'za']

SENIORITY_SEARCHES = {
    "entry": "junior data engineer",
    "mid": "data engineer",
    "senior": "senior data engineer",
}

def get_histogram(country, title):
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/histogram"
    params = {"app_id": APP_ID, "app_key": APP_KEY, "what": title, "content-type": "application/json"}
    resp = requests.get(url, params=params, timeout=15)
    return resp.status_code, resp.json() if resp.status_code == 200 else resp.text

def get_job_count(country, title):
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {"app_id": APP_ID, "app_key": APP_KEY, "what": title, "results_per_page": 1, "content-type": "application/json"}
    resp = requests.get(url, params=params, timeout=15)
    return resp.status_code, resp.json() if resp.status_code == 200 else resp.text

results = {}

for country in COUNTRIES:
    print(f"Fetching {country}...")
    results[country] = {}
    for level, title in SENIORITY_SEARCHES.items():
        hist_status, hist_data = get_histogram(country, title)
        time.sleep(1)
        count_status, count_data = get_job_count(country, title)
        time.sleep(1)

        histogram = hist_data.get("histogram") if hist_status == 200 else None
        job_count = count_data.get("count") if count_status == 200 else None

        # Weighted-average salary estimate from the histogram buckets
        avg_salary = None
        if histogram:
            total = sum(histogram.values())
            if total > 0:
                weighted_sum = sum(int(bucket) * count for bucket, count in histogram.items())
                avg_salary = round(weighted_sum / total)

        results[country][level] = {
            "search_title": title,
            "job_count": job_count,
            "avg_salary_estimate": avg_salary,
            "histogram": histogram,
        }
        print(f"  {level} ({title}): job_count={job_count}, avg_salary_estimate={avg_salary}")

with open("adzuna_raw_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to adzuna_raw_output.json")