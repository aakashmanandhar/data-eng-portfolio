import os
import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.environ.get('ADZUNA_APP_ID')
APP_KEY = os.environ.get('ADZUNA_APP_KEY')

if not APP_ID or not APP_KEY:
    print("ERROR: ADZUNA_APP_ID or ADZUNA_APP_KEY not found. Check your .env file.")
    exit(1)

# Test: salary histogram for data engineering jobs in Germany
url = f"https://api.adzuna.com/v1/api/jobs/de/histogram"
params = {
    "app_id": APP_ID,
    "app_key": APP_KEY,
    "what": "data engineer",
    "content-type": "application/json"
}

response = requests.get(url, params=params)
print(f"Status code: {response.status_code}")
print(response.json())