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
Notes: Countries are grouped into 4 archetypes using k-means clustering on AI-share percentage and total tracked GitHub activity (log-scaled) — this is a snapshot-based clustering, recomputed periodically, not a time-series trend. IMPORTANT: for simple "what archetype is X" questions, query this table ALONE with no join — it already has everything needed (country_code, archetype). Do NOT join to fact_country_ai_signal or fact_job_market for this kind of question; there's no need and no reliable shared key for the country name variant used there. Use this for questions like "what archetype is X in" or "which countries are Balanced Tech Hubs".

Table: dbt_dev_gold.fact_de_tool_by_country_year
Columns: survey_year (integer, 2016-2025), country (text, full country name e.g. 'United States', 'Germany' — NOT an ISO code), canonical_tool (text, e.g. 'Python', 'PostgreSQL', 'Docker'), tool_category (text: 'language', 'database', or 'platform'), respondent_count (integer), total_respondents (integer — total survey respondents for this country/year, the correct denominator), usage_pct (numeric 0-1, respondent_count/total_respondents)
Notes: This is Stack Overflow Developer Survey data (2016-2025, ~720K respondents, restricted to a whitelist of ~25 data-engineering-relevant tools), completely separate from the GitHub-based tables above (dim_github_repo, fact_country_ai_signal, etc.) — do NOT conflate "which tool is most used" (this table, self-reported survey usage) with "which tool has the most GitHub stars" (dim_github_repo, actual repo activity); these are different signals answering different questions. IMPORTANT: country here uses FULL country names, not ISO codes — do NOT join this to fact_country_ai_signal/fact_country_tool_signal/dim_country_archetype (all ISO-code-keyed) or assume the same country string format as fact_job_market (Adzuna job-market data — coincidentally also full names, but a completely different dataset about hiring/salary, not tool usage). Always use usage_pct for "what % use X" questions, never respondent_count alone (that's an absolute count, not comparable across countries of different sizes).

Table: dbt_dev_gold.fact_de_tool_ranking
Columns: survey_year (integer), country (text, full name), canonical_tool (text), tool_category (text), respondent_count (integer), total_respondents (integer), usage_pct (numeric 0-1), overall_respondent_count (integer), rank_in_country (integer — this tool's rank among all tools in THIS country for this year), rank_overall (integer — this tool's rank globally, across all countries combined, for this year and category)
Notes: Use rank_in_country=1 for "top tool in X country" questions; use rank_overall=1 for "top tool worldwide/globally" questions (always filter tool_category too, since language/database/platform are ranked separately, not against each other). Always filter to the specific survey_year being asked about, or MAX(survey_year) for "currently"/"most recent" questions.

Table: dbt_dev_gold.de_tool_forecast
Columns: scope (text: 'overall' or 'country'), country (text, full name, NULL when scope='overall'), tool_category (text), canonical_tool (text), years_of_history (integer), status (text: 'ok' or 'insufficient_data'), growth_rate_per_year (numeric, may be NULL — slope of usage_pct per year), r_squared (numeric, may be NULL), predicted_next_year_usage_pct (numeric 0-1, may be NULL), generated_at (date)
Notes: A per-tool regression forecast (scikit-learn LinearRegression) fit on fact_de_tool_by_country_year's real year-over-year history — NOT the same model as ai_adoption_forecast (that one is GitHub/arXiv/HackerNews-based, this one is Stack Overflow Survey-based; don't mix them up if a question mentions "forecast" ambiguously, ask which domain — GitHub trends vs. Stack Overflow tool usage — if unclear). Filter scope='country' AND country=X for a specific country's forecast, or scope='overall' for the global one. ALWAYS filter status='ok' and report status='insufficient_data' honestly (below 4 years of history) rather than fabricating a number — do not average/interpolate around a NULL prediction.

Table: dbt_dev_gold.org_maturity_archetype
Columns: respondent_id (integer), cluster_id (integer, 0-3), archetype_name (text: 'Cloud-Native Lakehouse Teams', 'Ad-Hoc Warehouse Teams', 'Airflow-Orchestrated Warehouse Teams', or 'Custom-Tooling Warehouse Teams'), generated_at (date)
Notes: This is from a completely different, separate 2026 survey (Practical Data Community / Joe Reis "State of Data Engineering" survey, ~1,101 respondents, a single point-in-time snapshot with NO year-over-year history) — do NOT confuse this with the Stack Overflow Survey tables above (fact_de_tool_by_country_year, etc.), they are unrelated datasets from different sources. There is NO country column here at all (the underlying survey only has 6 coarse regions, which aren't even exposed in this table) — never attempt to join or filter this by country. These archetypes reflect ORCHESTRATION/ARCHITECTURE TOOLING CHOICE, not a maturity ladder — be honest that "Ad-Hoc Warehouse Teams" isn't necessarily "less mature" in every sense, just a different tooling profile, if asked to rank or compare archetypes. For "what does archetype X commonly use/look like" questions, JOIN to dbt_dev_silver.silver_practical_data_survey ON respondent_id, then use MODE() WITHIN GROUP (ORDER BY <column>) to find the most common value per archetype (e.g. most common org_size, architecture_trend, orchestration, ai_adoption, biggest_bottleneck) — don't guess or use the silver table alone without this join for archetype-specific questions.

Table: dbt_dev_silver.silver_practical_data_survey
Columns: respondent_id (integer), role (text), org_size (text, e.g. '< 50 employees', '1,000–10,000'), industry (text), storage_environment (text), orchestration (text, e.g. 'Airflow', 'No orchestration / ad-hoc', 'Cloud-native (GCP Cloud Composer, AWS MWAA, etc.)'), ai_usage_frequency (text), ai_adoption (text, ordered least-to-most: 'No meaningful adoption yet' < 'Experimenting' < 'Using AI for tactical tasks' < 'Building internal AI platforms' < 'AI embedded in most workflows'), modeling_approach (text), architecture_trend (text, e.g. 'Centralized warehouse', 'Lakehouse', 'Data mesh / federated ownership'), biggest_bottleneck (text), team_growth_2026 (text), education_topic (text), region (text, one of 6 coarse regions), team_focus (array), ai_helps_with (array), modeling_pain_points (array)
Notes: Individual-respondent-level detail from the same 2026 Practical Data Community survey as org_maturity_archetype above (join on respondent_id for archetype-specific breakdowns). For a general "what % of respondents use X" question NOT tied to a specific archetype, query this table alone with GROUP BY and COUNT(*). Same caveats as org_maturity_archetype: single 2026 snapshot, no time-series, no country granularity (region is the finest geographic grain, only 6 values).

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