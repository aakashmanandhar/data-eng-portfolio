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
Notes: This is Stack Overflow Developer Survey data (2016-2025, ~720K respondents, restricted to a whitelist of ~25 data-engineering-relevant tools), completely separate from the GitHub-based tables above (dim_github_repo, fact_country_ai_signal, etc.) — do NOT conflate "which tool is most used" (this table, self-reported survey usage) with "which tool has the most GitHub stars" (dim_github_repo, actual repo activity); these are different signals answering different questions. IMPORTANT: country here uses FULL country names, not ISO codes — do NOT join this to fact_country_ai_signal/fact_country_tool_signal/dim_country_archetype (all ISO-code-keyed) or assume the same country string format as fact_job_market (Adzuna job-market data — coincidentally also full names, but a completely different dataset about hiring/salary, not tool usage). Always use usage_pct for "what % use X" questions, never respondent_count alone (that's an absolute count, not comparable across countries of different sizes). CRITICAL - GLOBAL/OVERALL TRENDS: this table is genuinely per-country grain ONLY - there is NO 'Global' or NULL country row, and no scope column here (that only exists on de_tool_forecast below, a different table - do not confuse the two). For "how has X's adoption changed overall/worldwide/globally" questions, you MUST aggregate across all countries yourself: SELECT survey_year, SUM(respondent_count)::numeric / SUM(total_respondents) AS usage_pct FROM dbt_dev_gold.fact_de_tool_by_country_year WHERE canonical_tool = 'X' GROUP BY survey_year ORDER BY survey_year. Never filter WHERE country = 'Global' or WHERE country IS NULL - both return zero rows and would incorrectly suggest no data exists when real data does.

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

Table: dbt_dev_gold.fact_github_org_trend
Columns: org_name (text: 'apache', 'dbt-labs', 'airbytehq', 'astronomer'), total_public_repos (integer), aggregate_stars (integer), aggregate_forks (integer), top_repos (JSON array of that org's individual repos with their own stars/language), snapshot_date (date), prev_stars (integer), star_growth (integer, stars gained since the previous snapshot), star_growth_pct (numeric)
Notes: Daily-refreshed org-level GitHub activity for 4 tracked data-engineering-adjacent organizations. IMPORTANT: this table has known duplicate rows for the same (org_name, snapshot_date) from repeated pipeline runs on the same day - ALWAYS use DISTINCT ON (org_name) ORDER BY org_name, snapshot_date DESC (or an equivalent dedup) to get one row per org, never a plain SELECT. For "which org is growing fastest" questions, compare star_growth or star_growth_pct on the latest snapshot per org.

Table: dbt_dev_gold.tool_co_adoption_cluster
Columns: repo_full_name (text, primary key), cluster_id (integer), cluster_name (text: 'Mainstream Global Tools', 'Apache Big-Data Ecosystem', 'Emerging & Community-Driven', or 'Cloud-Warehouse Adapters'), generated_at (date)
Notes: K-means clustering of ~90-96 tracked GitHub repos by their COUNTRY-ADOPTION PATTERN (which countries a tool is popular in), NOT by overall popularity or by topic/cohort - two tools can be totally unrelated in function but cluster together if they're popular in the same countries. Refreshed daily via the same Airflow DAG as the rest of Pipeline 2's GitHub data. For "what cluster is X in" or "what tools cluster with X" questions, query this table alone. Do not conflate this with the ai/traditional cohort field on dim_github_repo - that's a manually-curated topic categorization; this is a data-driven geographic-pattern clustering, a different and unrelated grouping.

IMPORTANT - "hype vs reality" / "underrated vs overhyped" gap questions (comparing real-world Stack Overflow Survey usage against GitHub star counts): only 8 tools exist in BOTH datasets with a genuine name match - all databases: Cassandra (apache/cassandra), Elasticsearch (elastic/elasticsearch), MariaDB (MariaDB/server), Microsoft SQL Server (microsoft/mssql-docker), MongoDB (mongodb/mongo), MySQL (mysql/mysql-server), PostgreSQL (postgres/postgres), Redis (redis/redis). Do NOT attempt this comparison for any other tool (languages, cloud platforms, Docker, Kubernetes, Databricks, or any specific DE tool like Airflow/dbt/Spark) - these have no real GitHub-Trends-tracked repo counterpart, since fact_de_tool_by_country_year tracks broad SO Survey categories while dim_github_repo tracks specific OSS projects; there is no meaningful "gap" to report outside these 8. If asked about the gap for a tool outside this list, say honestly that no comparable GitHub data exists for it rather than guessing or substituting a loosely-related repo.
HOW TO ANSWER for one of the 8 valid tools: query fact_de_tool_by_country_year (SUM(respondent_count)/SUM(total_respondents) for the latest survey_year, grouped by canonical_tool, to get real-world usage_pct) JOINED conceptually against dim_github_repo.stars for that tool's mapped repo (use two separate queries if a join key isn't natural). Report BOTH numbers directly (e.g. "PostgreSQL: 41% real developer usage vs 21,668 GitHub stars") - that alone answers the question honestly. If you want to also give a verdict, compare this tool's relative standing: a tool with a LOW usage_pct rank among the 8 but a HIGH star-count rank is "overhyped" (GitHub buzz exceeds real usage); the reverse (high usage rank, low star rank) is "underrated". Never respond that "data isn't available" for one of these 8 tools - the data exists in the two tables named above.

Table: dbt_dev_gold.fact_salary_by_experience
Columns: work_year (integer, 2020-2025), experience_level (text: 'EN'=Entry, 'MI'=Mid, 'SE'=Senior, 'EX'=Executive), respondent_count (integer), avg_salary_usd (numeric), median_salary_usd (numeric)
Notes: This is from the NEW ai-jobs-net-salaries source (2020-2025, weekly-refreshed via Airflow, global AI/ML/data job survey) - do NOT confuse with the OLD/retired fact_job_market table (Pipeline 1, Adzuna+SO Survey, only 19 countries, no longer has a frontend dashboard, RAG-only). If a question just says "salary" without specifying a source, prefer THIS table and the other 3 below it - they are the current, actively-maintained salary data. Real verified progression: EN ~$72K, MI ~$106K, SE ~$144K, EX ~$182K (median). Use median_salary_usd for "typical" questions, avg_salary_usd only if specifically asked for an average (median is more resistant to outlier executive salaries).

Table: dbt_dev_gold.fact_remote_ratio_trend
Columns: work_year (integer), remote_ratio (integer: 0=fully onsite, 50=hybrid, 100=fully remote), respondent_count (integer)
Notes: Same ai-jobs-net-salaries source. To answer "what % of jobs are remote in year X", compute respondent_count for remote_ratio=100 divided by the SUM of respondent_count across all 3 remote_ratio values for that year - do not report raw respondent_count alone as a percentage.

Table: dbt_dev_gold.fact_top_paying_title_by_year
Columns: work_year (integer, one row per year), job_title (text), respondent_count (integer), avg_salary_usd (numeric)
Notes: Same source. Already pre-filtered to require >=20 respondents before a title can be crowned "top paying" for that year (avoids a 2-person title with an outlier salary winning misleadingly) - this table already IS the answer to "top paying title in year X", no further filtering needed. Do not query silver_ai_jobs_salaries directly and take a raw MAX(salary) for this kind of question - that would surface an unreliable single outlier, not a real trend.

Table: dbt_dev_gold.fact_salary_by_tool
Columns: canonical_tool (text, one of 25 SO Survey tools - see fact_de_tool_by_country_year above for the full list), job_title (text), work_year (integer), respondent_count (integer), avg_salary_usd (numeric), median_salary_usd (numeric)
Notes: Joins the ai-jobs-net-salaries source to real job titles via a hand-built crosswalk (a tool like "Python" maps to MULTIPLE real titles - Data Scientist, ML Engineer, Data Engineer, AI Engineer - not one exclusive title, since that's how the real job market actually works). For "what's the salary for X tool" questions, AVERAGE avg_salary_usd across all job_title rows for that canonical_tool (do not just pick one row) - this matches the site's own locked design (multi-title average as the headline figure). IMPORTANT: canonical_tool here is NOT the same signal as fact_de_tool_by_country_year.canonical_tool's usage_pct - one is a REAL SALARY, the other is a REAL-WORLD USAGE PERCENTAGE from a different survey entirely; do not average or combine these two numbers together, they answer different questions ("how much does X pay" vs "how many developers use X"). Only 25 canonical tools have salary data here (languages/databases/cloud-platforms) - if asked about a tool NOT in that list (e.g. "Airflow", "dbt", "Kafka" - these are GitHub-repo-tracked tools in a completely different pipeline with no salary data at all), say honestly that salary data isn't available for that specific tool rather than guessing or substituting a loosely-related tool.

IMPORTANT - decoding categorical codes for the salary tables above: experience_level (EN=Entry-level, MI=Mid-level, SE=Senior-level, EX=Executive-level), employment_type on silver_ai_jobs_salaries if ever queried directly (FT=Full-time, PT=Part-time, CT=Contract, FL=Freelance), company_size (S=Small, M=Medium, L=Large). employee_residence and company_location are real ISO 3166-1 alpha-2 country codes (e.g. 'DE' for Germany, 'IN' for India) - when a question names a country, translate it to its real ISO alpha-2 code for the WHERE clause (standard, well-known codes - do not guess an unfamiliar/obscure code, and if genuinely unsure, say so rather than filtering on a wrong code).

Table: dbt_dev_gold.skill_salary_growth
Columns: canonical_tool (text), status (text), years_of_history (integer), growth_rate_per_year (numeric, USD/year), latest_salary (numeric), r_squared (numeric)
Notes: Real per-tool salary growth trend (LinearRegression on weighted-avg salary by year, from ai-jobs-net-salaries). Only status='ok' rows have real numbers - 4-year minimum history gate, 9 of 25 tools are honestly status='insufficient_data' (fewer than 4 years) and should be reported as "not enough data yet" if asked, never estimated. IMPORTANT: some tools show IDENTICAL growth_rate_per_year and latest_salary (e.g. Elasticsearch/MongoDB, PostgreSQL/MySQL) - this is real and expected, not a data error: those specific tools happen to map to the exact same set of job titles in the underlying crosswalk, so with no additional tool-specific salary signal, their computed numbers are genuinely identical. Explain this honestly if asked why two tools show the same number, rather than treating it as a bug.

Table: dbt_dev_gold.salary_forecast_multiyear
Columns: experience_level (EN/MI/SE/EX), forecast_year (integer, 2026-2028 only), status, growth_rate_per_year, predicted_salary, lower_bound, upper_bound (95% prediction interval, NOT a simple percentage guess - computed via the real standard-error-of-prediction formula for simple linear regression)
Notes: MANDATORY DISAMBIGUATION - a forecast for that EXPERIENCE LEVEL ACROSS ALL JOB TITLES COMBINED, never specific to any one role. If the question names a specific job title (e.g. "senior software engineer", "senior data engineer") alongside a future year, you MUST explicitly say the number is for ALL senior-level roles overall, NOT specific to that title - literally include a phrase like "across all roles at that level" in the answer. Do not present this table's number as if it answers a per-title question just because the question happened to name a title. There is no per-title FORECAST in this system at all - only per-level. If a per-title CURRENT figure is wanted, that's fact_salary_by_tool instead (no forecast, current data only). Never state a bound as more certain than it is - always mention both the predicted point AND its range when answering a forecast question.

Table: dbt_dev_gold.career_archetype
Columns: job_title (text), archetype (text - one of 4 real k-means-derived groups, named by real salary rank + remote tendency, e.g. "Highest-Paying · Onsite-Leaning"), median_salary_usd, avg_remote_ratio, avg_company_size_score, respondent_count
Notes: Clusters job TITLES (not individual people) by their typical salary/remote/company-size profile - only titles with 200+ respondents are included (a title not found here simply wasn't common enough for reliable clustering, not necessarily excluded on purpose in any other sense). The 4 archetype names are descriptive of REAL clustering results, not a fixed taxonomy - if the underlying data changes, the composition could shift even if names look similar.

Table: dbt_dev_gold.salary_predictor_metadata
Columns: r_squared (numeric, ~0.2475), mae_usd (numeric, ~$47,739), trained_on_rows, tested_on_rows
Notes: Describes the accuracy of a REAL trained RandomForestRegressor model (features: experience_level, remote_ratio, company_size, job_title -> predicted salary), NOT a table you can query to get someone's predicted salary directly - RAG cannot invoke this model. If asked "what would I make as a [title]", do NOT fabricate a number from this metadata table. Instead: (a) if a real close match exists in fact_salary_by_experience or career_archetype, cite that real aggregate figure with clear caveats, and (b) always mention the site has an interactive "Predict My Salary" tool (in this slide's tab section) that runs the actual model live with their specific inputs, and suggest they try it there for a real personalized number. Be honest that this model is modest in accuracy (~25% of variance explained, real predictions vary by roughly ±$48K) if asked how reliable it is - never overstate confidence.

Table: dbt_dev_gold.tool_momentum_stage
Columns: repo_full_name (text), cohort (text), status (text), days_of_history (integer), stage (text - one of 'Emerging', 'Accelerating', 'Mature', 'Declining'), avg_daily_growth (numeric), first_half_avg_growth (numeric), second_half_avg_growth (numeric), current_stars (integer)
Notes: This is the CORRECT and ONLY table for "momentum" questions - momentum specifically means real GROWTH-RATE ACCELERATION (comparing recent daily star growth to earlier daily star growth over a 14-day window), NOT raw popularity or total star count. Do NOT answer a "strongest momentum" question using dim_github_repo's raw stars alone - a repo can have huge total stars but flat or declining momentum, or modest stars but genuinely accelerating momentum; these are different questions. 10-day minimum history gate (status='ok' required). For "which tool has the strongest momentum" questions, filter stage='Accelerating' and sort by avg_daily_growth descending - report the actual growth rate number, not just the tool name, since that's the real evidence behind the "momentum" claim.

Table: dbt_dev_gold.dim_keyword
Columns: keyword_id (integer), keyword (text - one of 70 curated DE/AI-DE terms), category (text - Orchestration/Processing/Streaming/Warehouse/Database/Data Quality/BI/Cloud Platform/AI-DE Crossover/Broader Concept)
Notes: The tracked term list for the News & Sentiment Intelligence pipeline. Many of these keywords (Apache Airflow, Databricks, Snowflake, PostgreSQL, etc.) also appear as tool names in fact_github_repo_trend (GitHub stars), fact_de_tool_by_country_year (SO Survey adoption), and fact_salary_by_tool (salary data) - these are ALL DIFFERENT SIGNALS about the same tool name, never mix them. This table specifically is about NEWS COVERAGE VOLUME AND TONE, nothing else.

Table: dbt_dev_gold.dim_source
Columns: source_id (integer), source_domain (text, e.g. 'dev.to', 'vulners.com'), source_type (text, currently always 'news' - Hacker News as a second source type is a deliberate future addition, not yet built)

Table: dbt_dev_gold.fact_keyword_mention
Columns: keyword_id (integer, FK to dim_keyword), source_id (integer, FK to dim_source), mention_date (date), mention_count (integer)
Notes: Real daily article-mention counts per keyword per source domain, refreshed daily. For "how much news coverage did X get" questions, SUM(mention_count) across all sources for that keyword. This is coverage VOLUME only - for coverage TONE, use fact_keyword_sentiment_trend instead; they answer different questions.

Table: dbt_dev_gold.news_article_sentiment
Columns: article_id (text), keyword_id (integer), source_id (integer), sentiment_label (text: 'positive'/'negative'/'neutral'), sentiment_score (numeric, the model's own confidence in that label), published_at (timestamptz)
Notes: Built by a standalone Python script (score_news_sentiment.py), not a dbt model - real per-article sentiment from a Hugging Face transformer (cardiffnlp/twitter-roberta-base-sentiment-latest), trained on short social/headline-style text. This is the ONLY sentiment-based table on this entire site - do not confuse "sentiment" here with any other concept. sentiment_score is the model's confidence in its OWN label (e.g. 0.97 confidence that an article is 'positive'), NOT a -1-to-+1 polarity score - do not average sentiment_score directly as if it were a signed value. MANDATORY: never report sentiment_score alone - a bare number like "0.77" is meaningless without its label, since it could mean 77% confident positive OR 77% confident negative. Always report both together, e.g. "77% confidence it's positive."

Table: dbt_dev_gold.fact_keyword_sentiment_trend
Columns: keyword_id (integer), sentiment_date (date), mention_count (integer), avg_confidence (numeric), weighted_sentiment (numeric, -1 to +1, where +1 is fully positive and -1 is fully negative)
Notes: The REAL aggregated daily sentiment trend per keyword, built from news_article_sentiment by confidence-weighting each article's label (a high-confidence label pulls the daily average more than a low-confidence one) - this weighted_sentiment column IS the correct -1-to-+1 signed value to report for "is coverage of X positive or negative" questions, not sentiment_score from the article-level table. Values near 0 mean genuinely mixed/neutral coverage, not "no data" - check mention_count separately to distinguish "neutral coverage" from "no coverage that day".

Table: dbt_dev_gold.news_keyword_growth
Columns: keyword_id (integer), status (text: 'ok' or 'insufficient_data'), days_of_history (integer), growth_rate_per_day (numeric, may be NULL), r_squared (numeric, may be NULL), predicted_mentions_7d (numeric, may be NULL)
Notes: MANDATORY DISAMBIGUATION - this is NEWS MENTION growth (is a topic getting more or less news coverage over time), completely unrelated to skill_salary_growth (salary growth) despite the similar name and similar keyword overlap - never conflate the two if a question mentions "growth" ambiguously near a tool name. 5-day minimum real history gate, deliberately short since news topic churn moves in days not years - the forecast horizon is 7 days, not multi-year. This pipeline is brand new as of today, so status is honestly 'insufficient_data' for every keyword right now - report this honestly rather than guessing, and it's expected to start returning real 'ok' results within about a week of daily runs.

Table: dbt_dev_gold.news_keyword_breakout
Columns: keyword_id (integer), status (text: 'ok' or 'insufficient_data'), days_of_history (integer), today_mentions (integer, may be NULL), baseline_avg (numeric, may be NULL), is_breakout (boolean, may be NULL)
Notes: A DIFFERENT question from news_keyword_growth - whether TODAY's mention count spikes well above (2x+) a keyword's own recent baseline, regardless of its long-term trend direction. 4-day minimum real history gate. Same as news_keyword_growth, this pipeline is brand new, so status is honestly 'insufficient_data' for every keyword right now.

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
- If the question mentions "momentum" or "lifecycle stage", you MUST query dbt_dev_gold.tool_momentum_stage - NEVER answer a momentum question using dim_github_repo.stars alone, momentum means growth-rate acceleration, not raw popularity
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
    # Special-cased: momentum questions repeatedly confused two similarly-shaped
    # tables even with explicit schema/rule guidance (gemini-flash-lite-latest
    # hallucinated correct column names attached to the wrong table name) -
    # a hardcoded query is more reliable than continued prompt tuning here.
    if 'momentum' in question.lower() or 'lifecycle stage' in question.lower():
        sql = ("SELECT repo_full_name, stage, avg_daily_growth, current_stars "
               "FROM dbt_dev_gold.tool_momentum_stage WHERE status = 'ok' "
               "ORDER BY avg_daily_growth DESC LIMIT 5")
    else:
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

    Relevant schema context (use this to catch any mismatch between what was asked and what the data actually shows):
    {SCHEMA_DESCRIPTION}

    Phrase a short, clear, plain-language answer to the question based on this result. If the result is empty, say the data isn't available.
    If listing multiple values, use bullet points in this style: "• Label → value". Never use tables.

    CRITICAL HONESTY RULES:
    - If the question names something more SPECIFIC than what the SQL actually filtered or grouped by (e.g. a job title when the data is only grouped by experience level, or a single tool when the result mixes multiple), explicitly say so in plain words - never imply the answer is more specific than the underlying query actually was.
    - Never use technical jargon (R-squared, MAE, p-value, coefficient, etc.) without immediately explaining it in one plain-language phrase a non-technical person would understand - e.g. "R-squared of 0.25 (meaning the model explains about 25% of why salaries differ)".
    - If the result rows look confusing, inconsistent, or span multiple unrelated things, do not just list them all - synthesize a single clear, honest answer, or say plainly that a clean single answer isn't available.
    - If asked to predict/estimate something for a specific individual scenario, never fabricate a number from unrelated aggregate rows - state clearly that this system doesn't generate individual predictions this way, and only point to the site's own interactive predictor tool if one is documented in the schema context above for this table.
    - If the question asks to COMPARE two things and only ONE side of the comparison has real data available (e.g. one metric doesn't exist for that specific item, but a different, genuinely available metric does), do not stop at just refusing the unavailable half - clearly state which half isn't available and why, then still answer the half that IS genuinely answerable from the schema context above, so the person gets real, useful information rather than a dead end."""
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