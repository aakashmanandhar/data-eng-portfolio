import os
from google import genai
import psycopg2
import psycopg2.extras


client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))


def classify_question(question):
    """
    Classifies a question as either 'analytics' (needs SQL against the
    data warehouse) or 'project' (needs RAG over case study docs).
    """
    prompt = f"""Classify this question into exactly one category: "analytics" or "project".

"analytics" = questions about data engineering salaries, job postings, tool popularity, or statistics by country (e.g. "what's the average salary in Germany?", "what are the top tools in the US?")

"project" = questions about specific projects, their architecture, tech stack, or how something was built (e.g. "what stack did you use?", "how does the pipeline work?")

Question: {question}

Respond with ONLY the single word "analytics" or "project", nothing else."""

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt
    )
    result = response.text.strip().lower()
    return result if result in ('analytics', 'project') else 'project'



SCHEMA_DESCRIPTION = """
Table: dbt_dev_gold.fact_job_market
Columns: country_name (text), seniority_level (text: 'entry', 'mid', or 'senior'), job_count (integer), adzuna_salary_usd (numeric, may be NULL), so_survey_salary_usd (numeric, may be NULL)

Table: dbt_dev_silver.silver_tool_usage
Columns: country (text), tool_name (text), usage_count (integer), respondent_count (integer)

Table: dbt_dev_gold.fact_tool_preference_global
Columns: tool_name (text), preference_count (integer) — this is a GLOBAL ranking, not per-country
"""


def get_readonly_connection():
    return psycopg2.connect(
        host="portfolio_postgres",
        port=5432,
        dbname="portfolio",
        user="readonly_user",
        password="readonlypass123",
    )


def generate_sql(question):
    prompt = f"""You are a PostgreSQL expert. Given this schema:

{SCHEMA_DESCRIPTION}

Write a single SELECT query to answer this question: "{question}"

Rules:
- ONLY a SELECT statement, nothing else
- No semicolons
- Use ILIKE for text matching on country_name (e.g. country_name ILIKE '%germany%') since exact names may vary
- Respond with ONLY the raw SQL, no markdown formatting, no explanation

SQL:"""

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt
    )
    sql = response.text.strip()
    sql = sql.replace('```sql', '').replace('```', '').strip()
    return sql


def is_safe_select(sql):
    """Guard against anything except a read-only SELECT."""
    normalized = sql.strip().lower()
    if not normalized.startswith('select'):
        return False
    forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', ';']
    return not any(word in normalized for word in forbidden)


def answer_analytics_question(question):
    sql = generate_sql(question)

    if not is_safe_select(sql):
        return {"answer": "I couldn't safely answer that question.", "sql": sql, "source": "analytics (blocked)"}

    conn = get_readonly_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(sql)
        rows = cur.fetchall()
    except Exception as e:
        return {"answer": f"I ran into an error querying the data: {e}", "sql": sql, "source": "analytics (error)"}
    finally:
        cur.close()
        conn.close()

    format_prompt = f"""Question: {question}
SQL query used: {sql}
Result: {rows}

Phrase a short, clear, plain-language answer to the question based on this result. If the result is empty, say the data isn't available."""

    format_response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=format_prompt
    )

    return {"answer": format_response.text.strip(), "sql": sql, "source": "analytics"}