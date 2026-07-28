WITH github_deduped AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY repo_full_name, snapshot_date ORDER BY loaded_at DESC) AS rn
    FROM {{ ref('silver_github_repo_snapshot') }}
    WHERE cohort IN ('ai', 'traditional')
),

github_daily AS (
    SELECT
        cohort,
        snapshot_date,
        SUM(stars) AS total_stars,
        SUM(contributor_count) AS total_contributors
    FROM github_deduped
    WHERE rn = 1
    GROUP BY cohort, snapshot_date
),

arxiv_daily AS (
    SELECT cohort, snapshot_date, total_papers
    FROM {{ ref('silver_arxiv_snapshot') }}
),

hn_daily AS (
    SELECT cohort, snapshot_date, total_stories
    FROM {{ ref('silver_hackernews_snapshot') }}
),

combined AS (
    SELECT
        COALESCE(g.cohort, a.cohort, h.cohort) AS cohort,
        COALESCE(g.snapshot_date, a.snapshot_date, h.snapshot_date) AS snapshot_date,
        g.total_stars,
        g.total_contributors,
        a.total_papers,
        h.total_stories
    FROM github_daily g
    FULL OUTER JOIN arxiv_daily a
        ON a.cohort = g.cohort AND a.snapshot_date = g.snapshot_date
    FULL OUTER JOIN hn_daily h
        ON h.cohort = COALESCE(g.cohort, a.cohort)
        AND h.snapshot_date = COALESCE(g.snapshot_date, a.snapshot_date)
)

SELECT
    cohort,
    snapshot_date,
    COALESCE(total_stars, 0) AS total_stars,
    COALESCE(total_contributors, 0) AS total_contributors,
    COALESCE(total_papers, 0) AS total_papers,
    COALESCE(total_stories, 0) AS total_stories
FROM combined
WHERE cohort IS NOT NULL
ORDER BY cohort, snapshot_date