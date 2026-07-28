import os
import json
import time
import requests
import xml.etree.ElementTree as ET

NS = {'a': 'http://www.w3.org/2005/Atom'}

QUERIES = {
    "traditional": '(cat:cs.DB OR cat:cs.SE) AND (abs:"data engineering" OR abs:"data pipeline" OR abs:"ETL" OR abs:"data warehouse")',
    "ai": '(cat:cs.AI OR cat:cs.LG) AND (abs:"data engineering" OR abs:"data pipeline" OR abs:"LLM agent" OR abs:"retrieval augmented")',
}


def get_arxiv_count(query, max_retries=3):
    url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": query,
        "start": 0,
        "max_results": 1,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, timeout=20)
            if resp.status_code == 200:
                root = ET.fromstring(resp.text)
                total_elem = root.find('.//{http://a9.com/-/spec/opensearch/1.1/}totalResults')
                total = int(total_elem.text) if total_elem is not None else None
                return resp.status_code, total
            return resp.status_code, None
        except requests.exceptions.RequestException as e:
            print(f"    Attempt {attempt + 1}/{max_retries} failed: {e}")
            time.sleep(3)
    return None, None


results = {}
for cohort, query in QUERIES.items():
    print(f"Querying arXiv for cohort: {cohort}...")
    status, total = get_arxiv_count(query)
    results[cohort] = {
        "cohort": cohort,
        "total_papers": total,
        "query": query,
        "status": status,
    }
    print(f"  {cohort}: {total} total matching papers (status {status})")
    time.sleep(3)

with open("arxiv_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDone. Saved to arxiv_output.json")