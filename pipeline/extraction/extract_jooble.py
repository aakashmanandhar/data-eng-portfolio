import os
import json
import time
import http.client
from dotenv import load_dotenv

load_dotenv()

JOOBLE_API_KEY = os.environ.get('JOOBLE_API_KEY')

# Countries beyond Adzuna's 19-country coverage — location passed as country name,
# since Jooble's API takes free-text location rather than ISO country codes.
COUNTRIES = [
    'Germany', 'France', 'United Kingdom', 'United States', 'Canada', 'Australia',
    'Netherlands', 'Spain', 'Italy', 'Poland', 'Switzerland', 'Austria', 'Belgium',
    'Brazil', 'Mexico', 'India', 'Singapore', 'New Zealand', 'South Africa',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Portugal', 'Czech Republic',
    'Romania', 'Greece', 'Hungary', 'Ukraine', 'Turkey', 'Israel', 'UAE',
    'Japan', 'South Korea', 'Philippines', 'Indonesia', 'Malaysia', 'Thailand',
    'Vietnam', 'Argentina', 'Chile', 'Colombia', 'Egypt', 'Nigeria', 'Kenya',
    'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal',
]

SEARCH_KEYWORD = "data engineer"


def get_jooble_results(location):
    connection = http.client.HTTPSConnection('jooble.org')
    headers = {"Content-type": "application/json"}
    body = json.dumps({"keywords": SEARCH_KEYWORD, "location": location})
    connection.request('POST', '/api/' + JOOBLE_API_KEY, body, headers)
    response = connection.getresponse()
    status = response.status
    raw = response.read()
    connection.close()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = None
    return status, data


results = {}
for country in COUNTRIES:
    print(f"Fetching {country}...")
    status, data = get_jooble_results(country)
    time.sleep(1)

    job_count = data.get("totalCount") if status == 200 and data else None
    results[country] = {
        "search_keyword": SEARCH_KEYWORD,
        "job_count": job_count,
        "status": status,
    }
    print(f"  job_count={job_count} (status {status})")

with open("jooble_raw_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to jooble_raw_output.json")