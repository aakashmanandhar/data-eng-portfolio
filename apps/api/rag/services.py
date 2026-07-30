import os
import psycopg2
import psycopg2.extras
from google import genai

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))


def classify_question(question):
    """
    Classifies a question as either 'analytics' (needs SQL against the
    data warehouse) or 'project' (needs RAG over case study docs).
    """
    prompt = f"""Classify this question into exactly one category: "analytics" or "project".

"analytics" = questions about data engineering salaries, job postings, tool popularity, statistics by country, GitHub repo/star/contributor data, cohort comparisons (AI vs traditional tooling), or the AI adoption forecast model (growth rates, predictions, confidence scores, days of history, crossover timing) — e.g. "what's the average salary in Germany?", "what are the top tools in the US?", "how many stars does LangChain have?", "how confident is the forecast model?", "how many days of history is the forecast based on?"

"project" = questions about how this portfolio site itself was built — its architecture, tech stack, or engineering decisions (e.g. "what stack did you use?", "how does the RAG assistant work?", "why did you choose Airflow over Jenkins?")
Question: {question}

Respond with ONLY the single word "analytics" or "project", nothing else."""

    response = client.models.generate_content(
        model="gemini-flash-lite-latest",
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

Table: dbt_dev_gold.dim_github_repo
Columns: repo_full_name (text, e.g. 'apache/airflow'), cohort (text: 'ai', 'traditional', 'language', 'nosql', 'rdbms', 'lakehouse', 'analytics-bi', 'cloud-aws', 'cloud-azure', 'cloud-gcp', 'platform-databricks', 'platform-snowflake', or 'topic-<name>' for dynamically discovered repos), language (text), stars (integer), forks (integer), contributor_count (integer, may be NULL), description (text)
Notes: This is GitHub open-source repository data, refreshed daily. IMPORTANT: any question mentioning "GitHub," "stars," "repos," or asking about a specific tool/framework by name (e.g. "most popular tool," "which tool has the most stars," LangChain, Airflow, dbt, Spark, etc.) should query THIS table, not fact_tool_preference_global (which is Stack Overflow survey data about developer preferences, a completely different and unrelated dataset). To find "most popular tool," exclude cohort IN ('language', 'rdbms', 'nosql') unless the question is specifically about programming languages or databases — filter to cohort IN ('traditional', 'ai') for actual data engineering tools/frameworks.

Table: dbt_dev_gold.dim_github_org
Columns: org_name (text: 'apache', 'dbt-labs', 'airbytehq', 'astronomer'), total_public_repos (integer), aggregate_stars (integer), aggregate_forks (integer)
Notes: Aggregate GitHub activity for entire organizations, not individual repos.

Table: dbt_dev_gold.ai_adoption_forecast
Columns: cohort (text: 'ai' or 'traditional'), status (text: 'ok' or 'insufficient_data'), days_of_history (integer), daily_growth_rate (numeric — average GitHub stars gained per day, based on a linear regression trained on combined GitHub star growth, arXiv publication volume, and Hacker News discussion volume), current_stars (integer), r_squared (numeric — model fit confidence, 0 to 1), crossover_days_from_now (numeric, may be NULL — estimated days until the two cohorts' growth trajectories would cross, if on a converging path), generated_at (date)
Notes: This is a live, daily-retrained forecast model — use this table for any question about future trends, growth rate predictions, or "when will X overtake Y" type questions. Always report status='insufficient_data' honestly if that's what's returned (don't fabricate a forecast). For "which is growing faster" questions, compare daily_growth_rate between the two cohorts. IMPORTANT: this table can have multiple rows sharing the same generated_at date (re-runs on the same day) — always order by BOTH generated_at DESC AND created_at DESC (not generated_at alone) before taking the top row per cohort, since generated_at ties are otherwise resolved arbitrarily.

Table: dbt_dev_gold.fact_country_ai_signal
Columns: country_code (text, 2-letter ISO code e.g. 'US', 'IN', 'CN'), snapshot_date (date), ai_stargazers (integer — total stargazers across AI-cohort repos for this country), traditional_stargazers (integer — total stargazers across traditional-cohort repos), total_stargazers (integer, sum of both), ai_share_pct (numeric 0-1 — what fraction of this country's combined GitHub activity leans AI vs traditional)
Notes: This is a per-country breakdown derived from OSS Insight (api.ossinsight.io), covering ~122 tracked data engineering repos across all cohorts, aggregated to just the ai/traditional split per country. Use this for any "which country" or "by country" question about AI adoption. This is currently a single daily snapshot per country (not yet enough history for a per-country growth trend) — if asked about growth/trend/forecast by country, be honest that this feature needs more accumulated daily history and isn't available yet, rather than fabricating a trend from one data point.

Table: dbt_dev_gold.fact_country_tool_signal
Columns: repo_full_name (text, e.g. 'langchain-ai/langchain'), cohort (text), country_code (text), stargazers (integer), percentage (numeric 0-1 — this repo's share of stargazers from this specific country), snapshot_date (date)
Notes: This is a per-country breakdown derived from OSS Insight (api.ossinsight.io), covering ~122 tracked data engineering repos across all cohorts, aggregated to just the ai/traditional split per country. Already filtered to countries with at least 500 total tracked stargazers, so small-sample noise is excluded — safe to rank directly by ai_share_pct. IMPORTANT: country_code here is a 2-letter ISO code (e.g. 'US', 'IN') — do NOT join this to fact_job_market or dim_country, which use full country names; there is no shared key. For simple "which country" questions, query this table alone with no join. When answering any "highest/lowest %" question, ALWAYS also select and report total_stargazers alongside ai_share_pct, since a small country can have a high percentage from a genuinely small sample (e.g. Uruguay at 65% from only 714 total stars, vs. India at 58% from 15,552) — be transparent about scale, don't just report the percentage in isolation. This is currently a single daily snapshot per country (not yet enough history for a per-country growth trend) — if asked about growth/trend/forecast by country, be honest that this feature needs more accumulated history and isn't available yet.

Table: dbt_dev_gold.dim_country_archetype
Columns: country_code (text, 2-letter ISO code), archetype (text: 'AI-Leaning Hub', 'Balanced Tech Hub', 'Traditional-Leaning Hub', or 'Emerging Market'), ai_share_pct (numeric 0-1), total_stargazers (integer), generated_at (date)
Notes: Countries are grouped into 4 archetypes using k-means clustering on AI-share percentage and total tracked GitHub activity (log-scaled) — this is a snapshot-based clustering, recomputed periodically, not a time-series trend. Use this for questions like "what archetype is X in" or "which countries are Balanced Tech Hubs". This is a different, complementary view from fact_country_ai_signal (which gives raw percentages) — archetype groups countries into named patterns instead.
"""




def get_readonly_connection():
    return psycopg2.connect(
        host="portfolio_postgres",
        port=5432,
        dbname="portfolio",
        user="readonly_user",
        password="readonlypass123",
    )


def generate_sql(question, retry_context=None):
    retry_note = f"\n\nIMPORTANT: {retry_context}" if retry_context else ""
    prompt = f"""You are a PostgreSQL expert. Given this schema:

{SCHEMA_DESCRIPTION}

Write a single SELECT query to answer this question: "{question}"

Rules:
- ONLY a SELECT statement, nothing else
- No semicolons
- Use ILIKE for text matching on country_name (e.g. country_name ILIKE '%germany%') since exact names may vary
- Respond with ONLY the raw SQL, no markdown formatting, no explanation
- Double-check spelling of SQL keywords (SELECT, FROM, WHERE, ILIKE, GROUP BY, ORDER BY) before responding{retry_note}

SQL:"""

    response = client.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )
    sql = response.text.strip()
    sql = sql.replace('```sql', '').replace('```', '').strip()
    return sql


def is_safe_select(sql):
    """Guard against anything except a read-only SELECT."""
    import re
    normalized = sql.strip().lower()
    if not normalized.startswith('select'):
        return False
    forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant']
    if ';' in normalized:
        return False
    for word in forbidden:
        if re.search(rf'\b{word}\b', normalized):
            return False
    return True


def answer_analytics_question(question, max_attempts=2):
    sql = generate_sql(question)
    last_error = None

    for attempt in range(max_attempts):
        if not is_safe_select(sql):
            return {"answer": "I couldn't safely answer that question.", "sql": sql, "source": "analytics (blocked)"}

        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cur.execute(sql)
            rows = cur.fetchall()
            cur.close()
            conn.close()
            break
        except Exception as e:
            cur.close()
            conn.close()
            last_error = str(e)
            if attempt < max_attempts - 1:
                sql = generate_sql(
                    question,
                    retry_context=f"Your previous SQL failed with this error: {last_error}\nPrevious SQL: {sql}\nFix the SQL and try again."
                )
            else:
                return {"answer": f"I ran into an error querying the data: {last_error}", "sql": sql, "source": "analytics (error)"}

    format_prompt = f"""Question: {question}
    SQL query used: {sql}
    Result: {rows}

    Phrase a short, clear, plain-language answer to the question based on this result. If the result is empty, say the data isn't available.

    If listing multiple values, use bullet points in this style: "• Label → value". Never use tables."""
    format_response = client.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=format_prompt
    )

    return {"answer": format_response.text.strip(), "sql": sql, "source": "analytics"}


def embed_query(question):
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=question,
        config={"output_dimensionality": 1536}
    )
    return response.embeddings[0].values


def answer_project_question(question, top_k=4):
    query_embedding = embed_query(question)

    conn = get_readonly_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            """
            SELECT source_type, source_id, chunk_text,
                   embedding <-> %s::vector AS distance
            FROM rag_embedding
            ORDER BY distance
            LIMIT %s
            """,
            (query_embedding, top_k)
        )
        chunks = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    if not chunks:
        return {"answer": "I don't have any project documentation embedded yet.", "sources": [], "source": "project (empty)"}

    context = "\n\n---\n\n".join([c['chunk_text'] for c in chunks])

    prompt = f"""Answer this question using ONLY the context below. If the context doesn't contain a clear answer, say you don't have that information rather than guessing.

    Formatting rules:
    - Never use tables.
    - When listing multiple items or categories (like a tech stack), use bullet points in this exact style: "• Label → value, value, value"
    - Keep it concise, no unnecessary preamble.

    Context:
    {context}

    Question: {question}

    Answer:"""

    response = client.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )

    return {
        "answer": response.text.strip(),
        "sources": [{"source_type": c['source_type'], "source_id": c['source_id']} for c in chunks],
        "source": "project"
    }