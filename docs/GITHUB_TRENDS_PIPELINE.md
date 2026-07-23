# Data Engineering Portfolio

A live, self-hosted data platform powering [aakashmanandhar.tech](https://aakashmanandhar.tech) — two independently-orchestrated data pipelines, a full-stack CMS, and a Gemini-powered RAG assistant that can answer questions across both pipelines' live data.

---

## Table of Contents

1. [Pipeline 1 — Job Market & Tools Explorer (Jenkins)](#1-pipeline-1--job-market--tools-explorer-jenkins)
2. [Pipeline 2 — GitHub Trends: The Shift to AI Data Engineering (Airflow)](#2-pipeline-2--github-trends-the-shift-to-ai-data-engineering-airflow)
3. [Shared Infrastructure](#3-shared-infrastructure)
4. [RAG Assistant](#4-rag-assistant)
5. [Full Tech Stack](#5-full-tech-stack)

---

## 1. Pipeline 1 — Job Market & Tools Explorer (Jenkins)

Real salary, hiring, and tooling data across 20 countries, refreshed automatically every 6 hours.

### Architecture

```
Adzuna API ──┐
             ├──▶ Jenkins (every 6h) ──▶ PostgreSQL (bronze) ──▶ dbt (silver → gold) ──▶ Django API ──▶ React Explorer
SO Survey ───┘
```

### Data Sources

- **Adzuna API** — salary histograms + job posting counts across 19 countries
- **Stack Overflow Developer Survey** — tool usage + self-reported salary, filtered to countries with 20+ data-professional respondents

### Star Schema (gold layer)

- `dim_country` — 20 countries via a `country_mapping` seed
- `dim_tool` — 19 unique tools
- `fact_job_market` — seniority-level job counts + salary, cross-referenced against SO Survey salary

### Folder Structure

```
pipeline/
  extraction/
    extract_adzuna.py
    load_bronze.py
  dbt/
    models/
      silver/silver_job_market.sql
      gold/dim_country.sql, dim_tool.sql, fact_job_market.sql
    seeds/country_mapping.csv

infra/
  jenkins/Jenkinsfile          # extract → load bronze → dbt run → dbt test, cron: H */6 * * *

apps/
  api/analytics/               # JobMarketView, ToolUsageView, ToolPreferenceGlobalView
  web/src/pages/HomePage.jsx    # Explorer, Pipeline Health widget, dual-charts
```

### Setup

```bash
# .env (gitignored, repo root)
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

docker exec portfolio_django python extract_adzuna.py
docker exec portfolio_django python load_bronze.py
docker exec portfolio_dbt dbt run
docker exec portfolio_dbt dbt test
```

Jenkins job: **Pipeline script from SCM** → this repo → branch `main` → script path `infra/jenkins/Jenkinsfile`.

---

## 2. Pipeline 2 — GitHub Trends: The Shift to AI Data Engineering (Airflow)

Tracks real GitHub activity across traditional vs. AI-native data engineering tools, cloud provider popularity, and Databricks vs. Snowflake — refreshed daily.

### Architecture

```
┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐
│  Fixed Tool List │   │  Topic Discovery │   │  Org Activity  │
│   (57 repos)     │   │ (GitHub Search)  │   │ (4 orgs, paged)│
└────────┬─────────┘   └────────┬─────────┘   └────────┬───────┘
         │                      │                        │
         └──────────────────────┼────────────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │  Apache Airflow │  (daily, parallel fan-out/fan-in)
                        └────────┬────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │   PostgreSQL — bronze (raw)    │
                 │   append-only, snapshot_date   │
                 └───────────────┬───────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │  dbt — silver → gold           │
                 │  LAG()-based growth calc       │
                 └───────────────┬───────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  Django REST API         │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  React (Recharts)        │
                    └─────────────────────────┘
```

### Cohorts Tracked

| Cohort | Examples |
|---|---|
| `traditional` | Airflow, dbt-core, Spark, Kafka, Airbyte, Dagster, Flink, NiFi, Great Expectations, Meltano, Prefect, DuckDB, ClickHouse, Trino |
| `ai` | LangChain, LlamaIndex, pgvector, Weaviate, Milvus, MLflow, Haystack, Qdrant, Chroma, Feast, Ray, LiteLLM |
| `platform-databricks` / `platform-snowflake` | Official SDKs + dbt adapters |
| `cloud-azure` / `cloud-aws` / `cloud-gcp` | Official SDKs + relevant dbt adapters |
| `rdbms` / `nosql` / `lakehouse` / `language` / `analytics-bi` | Postgres, MySQL, MongoDB, Redis, Delta Lake, Iceberg, Python, Rust, Superset, Grafana |
| `topic-<name>` | Dynamically discovered via GitHub Search API: `data-engineering`, `etl`, `data-pipeline`, `data-ingestion`, `data-orchestration` |

### Folder Structure

```
infra/
  airflow/
    Dockerfile
    requirements.txt
  postgres-init/
    06-create-airflow-db.sql
    04-create-bronze-tables.sql   # includes github_repo_snapshot, github_org_snapshot
  terraform/
    main.tf                       # docker_container.airflow + docker_image.airflow

pipeline/
  airflow/dags/github_trends_dag.py
  extraction/
    extract_github.py             # fixed-list, 57 repos
    discover_github_topics.py     # topic search, 65 repos
    extract_github_orgs.py        # paginated org stats
    load_bronze_github.py
    load_bronze_github_discovery.py
    load_bronze_github_orgs.py
  dbt/models/
    silver/
      silver_github_repo_snapshot.sql
      silver_github_org_snapshot.sql
      sources.yml
    gold/
      dim_github_repo.sql         # latest snapshot per repo (ROW_NUMBER + loaded_at tiebreaker)
      dim_github_org.sql          # latest snapshot per org
      fact_github_repo_trend.sql  # LAG()-based day-over-day star growth
      fact_github_org_trend.sql
      schema.yml

apps/
  api/analytics/                  # GitHubRepoRankingView, GitHubCohortTrendView,
                                   # GitHubPlatformComparisonView, GitHubOrgActivityView
  api/rag/services.py             # SCHEMA_DESCRIPTION extended for both pipelines
  web/src/components/GitHubTrendsSlide.jsx
```

### Prerequisites

- A GitHub Personal Access Token (classic, scope: `public_repo` only) — [github.com/settings/tokens](https://github.com/settings/tokens)

### Setup

```bash
# .env (gitignored, repo root)
echo "GITHUB_TOKEN=ghp_your_real_token_here" >> .env

docker exec portfolio_postgres psql -U postgres -c "CREATE DATABASE airflow_meta;"
docker build -t portfolio-airflow:latest infra/airflow

cd infra/terraform
terraform apply

docker exec portfolio_airflow airflow dags unpause github_trends_pipeline
docker exec portfolio_airflow airflow dags trigger github_trends_pipeline
```

### ⚠️ Docker Socket Permission Gotcha

Airflow's official image runs as a non-root user (`uid=50000`), which cannot access `/var/run/docker.sock` on most real Linux hosts (the socket is owned by the `docker` group, and this user isn't in it — Docker Desktop on Mac is more permissive and won't show this). **Fix:** add `user = "root"` to the `docker_container "airflow"` block in `main.tf` — the same pattern already used for the Jenkins container.

### API Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/github-repos/` | All tracked repos: cohort, stars, forks, contributor_count, language |
| `GET /api/github-cohort-trend/` | Daily star totals by cohort, for trend charting |
| `GET /api/github-platforms/` | Repos in `cloud-*` and `platform-*` cohorts |
| `GET /api/github-orgs/` | Org aggregates: total repos, stars, forks, top repos |

### Notable Design Decisions

- **Contributor count** (via `/contributors?per_page=1` + parsing the `Link` header) is used as the "adoption for building" signal — GitHub has no direct field for this, and no official API exists for "used by"/dependents counts at all (the only workaround is unsanctioned HTML scraping).
- **Abandoned PyPI download stats** as an alternative adoption metric — `pypistats.org` enforces a strict ~30 requests/minute IP-based limit that repeatedly 429'd even with generous request spacing.
- **Time-series tiebreaking**: gold models use `ORDER BY snapshot_date DESC, loaded_at DESC` — the `loaded_at` tiebreaker is required, since Postgres's ordering for same-day duplicate snapshots is otherwise non-deterministic.

---

## 3. Shared Infrastructure

Both pipelines run on the same self-hosted stack:

- **PostgreSQL** (+pgvector) — single instance, separate bronze/gold schemas per pipeline
- **Docker + Terraform** — every service (Postgres, Jenkins, Airflow, Django, React, dbt) is a container, provisioned as code
- **Nginx + Cloudflare** — reverse proxy + free HTTPS in front of the VPS
- **Two orchestrators, deliberately** — Jenkins for the original pipeline's simple linear cron job; Airflow for GitHub Trends, where a genuine parallel dependency graph and time-series scheduling actually matter

## 4. RAG Assistant

A chat widget on the live site, powered by Google's Gemini API, that routes each question to one of two paths:

- **Text-to-SQL** — generates and executes read-only SQL against either pipeline's gold schema (with automatic retry-on-error for occasional LLM-generated SQL typos)
- **Vector retrieval (pgvector)** — grounds answers in embedded case study content, explicitly trained to say "I don't know" rather than hallucinate

The assistant's schema description covers both pipelines, so it can answer things like *"What's the average senior salary in Germany?"* and *"How many stars does LangChain have?"* in the same conversation.

## 5. Full Tech Stack

Django · Django REST Framework · React · PostgreSQL · pgvector · dbt · Terraform · Docker · Jenkins · Apache Airflow · Nginx · Cloudflare · Google Gemini API · Adzuna API · GitHub REST API · GitHub Search API · Stack Overflow Developer Survey

---

Live at **[aakashmanandhar.tech](https://aakashmanandhar.tech)** · Architecture deep-dive at [`/architecture`](https://aakashmanandhar.tech/architecture)