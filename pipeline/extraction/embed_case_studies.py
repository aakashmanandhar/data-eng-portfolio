import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))

conn = psycopg2.connect(
    host="portfolio_postgres",
    port=5432,
    dbname="portfolio",
    user="postgres",
    password="localdevpassword",
)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def chunk_text(text, max_chars=1500):
    """Split text into chunks, breaking on paragraph boundaries where possible."""
    if not text:
        return []
    text = text.replace('\r\n', '\n')
    paragraphs = text.split('\n\n')
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) < max_chars:
            current += para + "\n\n"
        else:
            if current.strip():
                chunks.append(current.strip())
            current = para + "\n\n"
    if current.strip():
        chunks.append(current.strip())
    return chunks


def embed_and_store(source_type, source_id, field_name, text):
    chunks = chunk_text(text)
    for chunk in chunks:
        if len(chunk.strip()) < 20:
            continue  # skip near-empty chunks
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=chunk,
            config={"output_dimensionality": 1536}
        )
        embedding = response.embeddings[0].values
        cur.execute(
            "INSERT INTO rag_embedding (source_type, source_id, chunk_text, embedding, created_at) VALUES (%s, %s, %s, %s, now())",
            (source_type, source_id, f"[{field_name}] {chunk}", embedding)
        )
        print(f"  Embedded chunk from {source_type} #{source_id} ({field_name}), {len(chunk)} chars")


# Clear existing embeddings for a clean re-run
cur.execute("TRUNCATE rag_embedding RESTART IDENTITY;")

# Fetch all published case studies
cur.execute("SELECT id, title, problem, architecture, outcome, readme_content FROM content_casestudy WHERE is_published = true;")
case_studies = cur.fetchall()

print(f"Found {len(case_studies)} published case studies to embed.\n")

for cs in case_studies:
    print(f"Processing: {cs['title']}")
    embed_and_store('case_study', cs['id'], 'problem', cs['problem'])
    embed_and_store('case_study', cs['id'], 'architecture', cs['architecture'])
    embed_and_store('case_study', cs['id'], 'outcome', cs['outcome'])
    embed_and_store('case_study', cs['id'], 'readme', cs['readme_content'])

conn.commit()
cur.close()
conn.close()
print("\nDone. All case study content embedded.")