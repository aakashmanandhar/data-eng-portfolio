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