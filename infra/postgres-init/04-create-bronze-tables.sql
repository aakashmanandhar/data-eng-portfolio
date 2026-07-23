CREATE TABLE IF NOT EXISTS bronze.adzuna_job_market (
    id SERIAL PRIMARY KEY,
    country_code TEXT NOT NULL,
    seniority_level TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bronze.so_survey_by_country (
    id SERIAL PRIMARY KEY,
    country TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bronze.so_survey_preferred_global (
    id SERIAL PRIMARY KEY,
    raw_data JSONB NOT NULL,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bronze.jooble_job_market (
    id SERIAL PRIMARY KEY,
    country TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bronze.github_repo_snapshot (
    id SERIAL PRIMARY KEY,
    repo_full_name TEXT NOT NULL,
    cohort TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bronze.github_org_snapshot (
    id SERIAL PRIMARY KEY,
    org_name TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);