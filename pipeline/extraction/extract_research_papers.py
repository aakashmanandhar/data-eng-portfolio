import time
import requests
import xml.etree.ElementTree as ET

NS = {
    'a': 'http://www.w3.org/2005/Atom',
    'arxiv': 'http://arxiv.org/schemas/atom',
}

QUERY = (
    '(cat:cs.DB OR cat:cs.AI OR cat:cs.LG OR cat:cs.SE OR cat:cs.DC) AND '
    '(abs:"data engineering" OR abs:"data pipeline" OR abs:"ETL" OR '
    'abs:"data warehouse" OR abs:"LLM agent" OR abs:"retrieval augmented" OR '
    'abs:"vector database" OR abs:"data quality" OR abs:"MLOps" OR '
    'abs:"data mesh" OR abs:"agentic")'
)

PAGE_SIZE = 100
MAX_PAGES = 8  # up to 800 papers per run
BASE_URL = "http://export.arxiv.org/api/query"


def fetch_page(start, max_retries=3):
    params = {
        "search_query": QUERY,
        "start": start,
        "max_results": PAGE_SIZE,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    for attempt in range(max_retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=30)
            if resp.status_code == 200:
                return resp.text
            print(f"  status {resp.status_code} on attempt {attempt + 1}")
        except requests.exceptions.RequestException as e:
            print(f"  attempt {attempt + 1}/{max_retries} failed: {e}")
        time.sleep(4)
    return None


def parse_entries(xml_text):
    root = ET.fromstring(xml_text)
    entries = []
    for entry in root.findall('a:entry', NS):
        arxiv_id = entry.find('a:id', NS).text.strip().split('/abs/')[-1]
        title = entry.find('a:title', NS).text.strip().replace('\n', ' ')
        summary = entry.find('a:summary', NS).text.strip().replace('\n', ' ')
        published = entry.find('a:published', NS).text.strip()
        authors = [a.find('a:name', NS).text for a in entry.findall('a:author', NS)]
        link = entry.find('a:id', NS).text.strip()
        entries.append({
            "external_id": arxiv_id,
            "title": title[:500],
            "summary": summary[:2000],
            "url": link,
            "authors": ", ".join(authors)[:500],
            "published_at": published,
        })
    return entries


def main():
    all_papers = []
    for page in range(MAX_PAGES):
        start = page * PAGE_SIZE
        print(f"Fetching page {page + 1}/{MAX_PAGES} (start={start})...")
        xml_text = fetch_page(start)
        if xml_text is None:
            print("  giving up on this page after retries")
            break
        entries = parse_entries(xml_text)
        if not entries:
            print("  no more results, stopping pagination")
            break
        all_papers.extend(entries)
        print(f"  got {len(entries)} papers (total so far: {len(all_papers)})")
        time.sleep(3)  # be polite to arXiv's rate limits

    import json
    with open("research_papers_output.json", "w") as f:
        json.dump(all_papers, f, indent=2)
    print(f"\nDone. {len(all_papers)} papers saved to research_papers_output.json")


if __name__ == "__main__":
    main()
