"""
Self-healing agent: called by Airflow's on_failure_callback when a task fails.
Sends the error context to Gemini for root-cause diagnosis, logs it to
analytics.AgentDiagnosis via the Django API, and flags whether the failure
looks safe to auto-retry (transient/network/rate-limit) vs needs a human.

Usage: python diagnose_task_failure.py <task_id> <dag_run_id> "<error_summary>"
"""
import os
import sys
import json
import requests
from google import genai
from dotenv import load_dotenv

load_dotenv('/secrets/.env')

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))

SAFE_TO_RETRY_KEYWORDS = [
    "timeout", "connection", "rate limit", "429", "503", "502",
    "temporarily unavailable", "econnreset", "read timed out",
]


def diagnose(task_id, dag_run_id, error_summary):
    prompt = f"""You are a data pipeline reliability agent. A task in an Airflow DAG failed.

Task ID: {task_id}
Error:
{error_summary}

Respond in this exact format, nothing else:
DIAGNOSIS: <one to two sentence root cause>
FIX: <one to two sentence suggested fix, or "None needed - safe to retry" if transient>
SEVERITY: <low, medium, or high>
"""
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
        )
        text = response.text.strip()
    except Exception as e:
        text = f"DIAGNOSIS: Agent call failed ({e})\nFIX: Manual review needed\nSEVERITY: medium"

    diagnosis, fix, severity = "", "", "medium"
    for line in text.splitlines():
        if line.startswith("DIAGNOSIS:"):
            diagnosis = line.split(":", 1)[1].strip()
        elif line.startswith("FIX:"):
            fix = line.split(":", 1)[1].strip()
        elif line.startswith("SEVERITY:"):
            sev = line.split(":", 1)[1].strip().lower()
            if sev in ("low", "medium", "high"):
                severity = sev

    auto_retried = any(kw in error_summary.lower() for kw in SAFE_TO_RETRY_KEYWORDS)

    return {
        "task_id": task_id,
        "dag_run_id": dag_run_id,
        "error_summary": error_summary[:2000],
        "diagnosis": diagnosis or "Unable to parse diagnosis",
        "suggested_fix": fix,
        "severity": severity,
        "auto_retried": auto_retried,
    }


def main():
    if len(sys.argv) < 4:
        print("Usage: python diagnose_task_failure.py <task_id> <dag_run_id> <error_summary>")
        sys.exit(1)

    task_id, dag_run_id, error_summary = sys.argv[1], sys.argv[2], sys.argv[3]
    result = diagnose(task_id, dag_run_id, error_summary)

    api_base = os.environ.get("INTERNAL_API_BASE", "http://host.docker.internal:8000")
    try:
        resp = requests.post(f"{api_base}/api/agent-diagnosis/", json=result, timeout=10)
        print(f"Logged diagnosis (status {resp.status_code}): {result['diagnosis']}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to log diagnosis via API: {e}")
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
