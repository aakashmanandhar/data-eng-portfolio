import joblib
import os
import psycopg2
import psycopg2.extras
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics
from .models import PipelineRun
from .serializers import PipelineRunSerializer
from django.utils import timezone
from datetime import timedelta
from .models import VisitorSession


def get_readonly_connection():
    return psycopg2.connect(
        host="portfolio_postgres",
        port=5432,
        dbname="portfolio",
        user="readonly_user",
        password="readonlypass123",
    )

COUNTRY_NAME_TO_CODE = {
    'Australia': 'AU', 'Austria': 'AT', 'Belgium': 'BE', 'Brazil': 'BR', 'Canada': 'CA',
    'France': 'FR', 'Germany': 'DE', 'India': 'IN', 'Italy': 'IT', 'Mexico': 'MX',
    'Netherlands': 'NL', 'New Zealand': 'NZ', 'Poland': 'PL', 'Singapore': 'SG',
    'South Africa': 'ZA', 'Spain': 'ES', 'Switzerland': 'CH', 'United Kingdom': 'GB',
    'United States of America': 'US',
}


class CareerFitView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT country_code, growth_rate_per_day, current_ai_share_pct
            FROM dbt_dev_gold.country_growth_forecast
            WHERE status = 'ok'
        """)
        growth_by_code = {r['country_code']: r for r in cur.fetchall()}

        cur.execute("""
            SELECT country_name, job_count, so_survey_salary_usd
            FROM dbt_dev_gold.fact_job_market
            WHERE seniority_level = 'mid' AND so_survey_salary_usd IS NOT NULL
        """)
        salary_rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for row in salary_rows:
            code = COUNTRY_NAME_TO_CODE.get(row['country_name'])
            growth = growth_by_code.get(code)
            if not code or not growth:
                continue
            results.append({
                "country_code": code,
                "country_name": row['country_name'],
                "growth_rate_per_day": growth['growth_rate_per_day'],
                "current_ai_share_pct": growth['current_ai_share_pct'],
                "mid_salary_usd": row['so_survey_salary_usd'],
                "job_count": row['job_count'],
            })
        results.sort(key=lambda r: r['growth_rate_per_day'], reverse=True)
        return Response(results)


class JobMarketView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT country_name, seniority_level, job_count, adzuna_salary_usd, so_survey_salary_usd
            FROM dbt_dev_gold.fact_job_market
            ORDER BY country_name, seniority_level
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)


class ToolUsageView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT t.country, t.tool_name, t.usage_count,
                   (b.raw_data->>'respondent_count')::INTEGER AS respondent_count
            FROM dbt_dev_silver.silver_tool_usage t
            JOIN bronze.so_survey_by_country b ON b.country = t.country
            ORDER BY t.country, t.usage_count DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)
        
class ToolPreferenceGlobalView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT tool_name, preference_count
            FROM dbt_dev_gold.fact_tool_preference_global
            ORDER BY preference_count DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)
    
class LastRefreshedView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor()
        cur.execute("SELECT MAX(loaded_at) FROM bronze.adzuna_job_market;")
        result = cur.fetchone()
        cur.close()
        conn.close()
        return Response({"last_refreshed": result[0]})

class PipelineRunListView(generics.ListAPIView):
    serializer_class = PipelineRunSerializer

    def get_queryset(self):
        queryset = PipelineRun.objects.all()
        pipeline = self.request.query_params.get('pipeline')
        if pipeline:
            queryset = queryset.filter(pipeline_name=pipeline)
        return queryset[:10]

class GitHubRepoRankingView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT repo_full_name, cohort, language, stars, forks, contributor_count, description, latest_snapshot_date
            FROM dbt_dev_gold.dim_github_repo
            ORDER BY stars DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)


class GitHubCohortTrendView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT cohort, snapshot_date, SUM(stars) AS total_stars, COUNT(*) AS repo_count
            FROM dbt_dev_gold.fact_github_repo_trend
            WHERE cohort IN ('traditional', 'ai')
            GROUP BY cohort, snapshot_date
            ORDER BY snapshot_date, cohort
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)


class GitHubPlatformComparisonView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT repo_full_name, cohort, stars, forks, contributor_count
            FROM dbt_dev_gold.dim_github_repo
            WHERE cohort LIKE 'platform-%' OR cohort LIKE 'cloud-%'
            ORDER BY cohort, stars DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)


class GitHubOrgActivityView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT org_name, total_public_repos, aggregate_stars, aggregate_forks, top_repos
            FROM dbt_dev_gold.dim_github_org
            ORDER BY aggregate_stars DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)

class AIAdoptionForecastView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON (cohort) cohort, status, days_of_history, days_required,
                   daily_growth_rate, current_stars, r_squared, message,
                   crossover_days_from_now, generated_at
            FROM dbt_dev_gold.ai_adoption_forecast
            ORDER BY cohort, generated_at DESC, created_at DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)

class VisitorHeartbeatView(APIView):
    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({"error": "session_id required"}, status=400)
        VisitorSession.objects.update_or_create(
            session_id=session_id,
            defaults={}
        )
        return Response({"ok": True})


class VisitorCountView(APIView):
    def get(self, request):
        cutoff = timezone.now() - timedelta(seconds=30)
        count = VisitorSession.objects.filter(last_seen__gte=cutoff).count()
        return Response({"active_visitors": count})

class VisitorStatsView(APIView):
    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        return Response({
            "today": VisitorSession.objects.filter(created_at__gte=today_start).count(),
            "this_week": VisitorSession.objects.filter(created_at__gte=week_ago).count(),
            "this_month": VisitorSession.objects.filter(created_at__gte=month_ago).count(),
        })

class CountryAISignalView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON (country_code)
                country_code, ai_stargazers, traditional_stargazers, total_stargazers, ai_share_pct
            FROM dbt_dev_gold.fact_country_ai_signal
            ORDER BY country_code, snapshot_date DESC
        """)
        rows = cur.fetchall()
        rows.sort(key=lambda r: r['total_stargazers'], reverse=True)
        cur.close()
        conn.close()
        return Response(rows)

class DeToolSummaryView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                SUM(respondent_count) AS total_tool_selections,
                COUNT(DISTINCT country) AS countries_covered,
                MIN(survey_year) AS earliest_year,
                MAX(survey_year) AS latest_year
            FROM dbt_dev_gold.fact_de_tool_by_country_year
        """)
        summary = cur.fetchone()
        cur.execute("""
            SELECT DISTINCT canonical_tool, tool_category
            FROM dbt_dev_gold.fact_de_tool_ranking
            WHERE rank_overall = 1 AND survey_year = (SELECT MAX(survey_year) FROM dbt_dev_gold.fact_de_tool_ranking)
            ORDER BY tool_category
        """)
        top_tools = cur.fetchall()
        cur.execute("""
            SELECT canonical_tool, tool_category,
                   SUM(respondent_count)::numeric / NULLIF(SUM(total_respondents), 0) AS usage_pct
            FROM dbt_dev_gold.fact_de_tool_by_country_year
            WHERE survey_year = (SELECT MAX(survey_year) FROM dbt_dev_gold.fact_de_tool_by_country_year)
            GROUP BY canonical_tool, tool_category
            ORDER BY usage_pct DESC
            LIMIT 10
        """)
        top10_overall = cur.fetchall()
        cur.execute("""
            SELECT canonical_tool, tool_category, growth_rate_per_year, predicted_next_year_usage_pct
            FROM dbt_dev_gold.de_tool_forecast
            WHERE scope = 'overall' AND status = 'ok'
            ORDER BY predicted_next_year_usage_pct DESC
            LIMIT 5
        """)
        forecast_trend = cur.fetchall()
        top_tool_name = top10_overall[0]['canonical_tool'] if top10_overall else None
        trend_over_time = []
        if top_tool_name:
            cur.execute("""
                SELECT survey_year,
                       SUM(respondent_count)::numeric / NULLIF(SUM(total_respondents), 0) AS usage_pct
                FROM dbt_dev_gold.fact_de_tool_by_country_year
                WHERE canonical_tool = %s
                GROUP BY survey_year
                ORDER BY survey_year
            """, (top_tool_name,))
            trend_over_time = cur.fetchall()
        cur.close()
        conn.close()
        return Response({
            "summary": summary,
            "top_tools_by_category": top_tools,
            "top10_overall": top10_overall,
            "forecast_trend": forecast_trend,
            "trend_over_time": {"tool": top_tool_name, "points": trend_over_time},
        })


class DeToolByCountryView(APIView):
    def get(self, request):
        country = request.query_params.get('country')
        if not country:
            return Response({"error": "country query param required"}, status=400)
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT canonical_tool, tool_category, usage_pct, respondent_count, total_respondents
            FROM dbt_dev_gold.fact_de_tool_by_country_year
            WHERE country = %s AND survey_year = (SELECT MAX(survey_year) FROM dbt_dev_gold.fact_de_tool_by_country_year WHERE country = %s)
            ORDER BY usage_pct DESC
        """, (country, country))
        top_tools = cur.fetchall()
        cur.execute("""
            SELECT canonical_tool, tool_category, growth_rate_per_year, predicted_next_year_usage_pct
            FROM dbt_dev_gold.de_tool_forecast
            WHERE scope = 'country' AND country = %s AND status = 'ok'
            ORDER BY predicted_next_year_usage_pct DESC
            LIMIT 5
        """, (country,))
        forecast_trend = cur.fetchall()
        top_forecast = forecast_trend[0] if forecast_trend else None
        top_tool_name = top_tools[0]['canonical_tool'] if top_tools else None
        trend_over_time = []
        if top_tool_name:
            cur.execute("""
                SELECT survey_year, usage_pct
                FROM dbt_dev_gold.fact_de_tool_by_country_year
                WHERE country = %s AND canonical_tool = %s
                ORDER BY survey_year
            """, (country, top_tool_name))
            trend_over_time = cur.fetchall()
        cur.close()
        conn.close()
        return Response({
            "country": country,
            "top_tools": top_tools,
            "top_forecast": top_forecast,
            "forecast_trend": forecast_trend,
            "trend_over_time": {"tool": top_tool_name, "points": trend_over_time},
        })

class OrgArchetypeSummaryView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT
                a.archetype_name,
                COUNT(*) AS respondent_count,
                MODE() WITHIN GROUP (ORDER BY s.org_size) AS common_org_size,
                MODE() WITHIN GROUP (ORDER BY s.architecture_trend) AS common_architecture,
                MODE() WITHIN GROUP (ORDER BY s.orchestration) AS common_orchestration,
                MODE() WITHIN GROUP (ORDER BY s.ai_adoption) AS common_ai_adoption,
                MODE() WITHIN GROUP (ORDER BY s.biggest_bottleneck) AS common_bottleneck
            FROM dbt_dev_gold.org_maturity_archetype a
            JOIN dbt_dev_silver.silver_practical_data_survey s ON s.respondent_id = a.respondent_id
            GROUP BY a.archetype_name
            ORDER BY respondent_count DESC
        """)
        archetypes = cur.fetchall()
        cur.execute("""
            SELECT ai_adoption, COUNT(*) AS count
            FROM dbt_dev_silver.silver_practical_data_survey
            WHERE ai_adoption IS NOT NULL
            GROUP BY ai_adoption
            ORDER BY count DESC
        """)
        ai_adoption_breakdown = cur.fetchall()
        cur.close()
        conn.close()
        total_respondents = sum(a['respondent_count'] for a in archetypes)
        return Response({
            "total_respondents": total_respondents,
            "archetypes": archetypes,
            "ai_adoption_breakdown": ai_adoption_breakdown,
        })

class OssLandscapeSummaryView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Idea #4: org-level competitive landscape (latest snapshot per org)
        cur.execute("""
            SELECT DISTINCT ON (org_name)
                org_name, total_public_repos, aggregate_stars, aggregate_forks,
                star_growth, star_growth_pct, snapshot_date
            FROM dbt_dev_gold.fact_github_org_trend
            ORDER BY org_name, snapshot_date DESC
        """)
        org_landscape = cur.fetchall()

        # Idea #3: tool co-adoption clusters (grouped counts + sample members)
        cur.execute("""
            SELECT cluster_name, COUNT(*) AS repo_count,
                   array_agg(repo_full_name ORDER BY repo_full_name) AS sample_repos
            FROM dbt_dev_gold.tool_co_adoption_cluster
            GROUP BY cluster_name
            ORDER BY repo_count DESC
        """)
        co_adoption_clusters = cur.fetchall()
        for c in co_adoption_clusters:
            c['sample_repos'] = c['sample_repos'][:5]

        cur.close()
        conn.close()
        return Response({
            "org_landscape": org_landscape,
            "co_adoption_clusters": co_adoption_clusters,
            "tool_momentum_status": "building_history",
        })

SURVEY_TO_GITHUB_REPO = {
    "Cassandra": "apache/cassandra",
    "Elasticsearch": "elastic/elasticsearch",
    "MariaDB": "MariaDB/server",
    "Microsoft SQL Server": "microsoft/mssql-docker",
    "MongoDB": "mongodb/mongo",
    "MySQL": "mysql/mysql-server",
    "PostgreSQL": "postgres/postgres",
    "Redis": "redis/redis",
}


class SentimentVsAdoptionGapView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT canonical_tool,
                   SUM(respondent_count)::numeric / NULLIF(SUM(total_respondents), 0) AS survey_usage_pct
            FROM dbt_dev_gold.fact_de_tool_by_country_year
            WHERE canonical_tool = ANY(%s)
              AND survey_year = (SELECT MAX(survey_year) FROM dbt_dev_gold.fact_de_tool_by_country_year)
            GROUP BY canonical_tool
        """, (list(SURVEY_TO_GITHUB_REPO.keys()),))
        survey_rows = {r['canonical_tool']: r['survey_usage_pct'] for r in cur.fetchall()}

        repo_names = list(SURVEY_TO_GITHUB_REPO.values())
        cur.execute("""
            SELECT repo_full_name, stars, contributor_count
            FROM dbt_dev_gold.dim_github_repo
            WHERE repo_full_name = ANY(%s)
        """, (repo_names,))
        github_rows = {r['repo_full_name']: r for r in cur.fetchall()}

        results = []
        for tool, repo in SURVEY_TO_GITHUB_REPO.items():
            survey_pct = survey_rows.get(tool)
            gh = github_rows.get(repo)
            if survey_pct is None or gh is None:
                continue
            results.append({
                "tool": tool,
                "repo": repo,
                "survey_usage_pct": round(float(survey_pct), 4),
                "github_stars": gh['stars'],
                "github_contributors": gh['contributor_count'],
            })
        results.sort(key=lambda r: r['survey_usage_pct'], reverse=True)

        cur.close()
        conn.close()
        return Response({"gap_analysis": results})
    
class CountryArchetypeView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT country_code, archetype, ai_share_pct, total_stargazers
            FROM dbt_dev_gold.dim_country_archetype
            ORDER BY total_stargazers DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)

class CountryToolSignalView(APIView):
    def get(self, request):
        repo = request.query_params.get('repo')
        if not repo:
            return Response({"error": "repo query param required"}, status=400)
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT ON (country_code) country_code, stargazers, percentage
            FROM dbt_dev_gold.fact_country_tool_signal
            WHERE repo_full_name = %s
            ORDER BY country_code, snapshot_date DESC
        """, (repo,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        rows.sort(key=lambda r: r['stargazers'], reverse=True)
        return Response(rows)

class GrowthForecastStatusView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT COUNT(DISTINCT snapshot_date) AS days FROM dbt_dev_gold.fact_country_ai_signal")
        days = cur.fetchone()['days']
        cur.close()
        conn.close()
        threshold = 7
        return Response({"days_of_history": days, "threshold": threshold, "ready": days >= threshold})

class MomentumStatusView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT COUNT(DISTINCT snapshot_date) AS days FROM dbt_dev_gold.fact_github_repo_trend")
        days = cur.fetchone()['days']
        cur.close()
        conn.close()
        threshold = 14
        return Response({"days_of_history": days, "threshold": threshold, "ready": days >= threshold})

class CountryGrowthForecastView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT country_code, status, days_of_history, growth_rate_per_day,
                   current_ai_share_pct, predicted_ai_share_pct_30d, r_squared
            FROM dbt_dev_gold.country_growth_forecast
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)

class ToolListView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT DISTINCT repo_full_name, cohort
            FROM dbt_dev_gold.fact_country_tool_signal
            WHERE repo_full_name !~* '(awesome|how-?to|roadmap|course|tutorial|guide|learning|resources|interview|cheat-?sheet|list|handbook|book)'
            ORDER BY repo_full_name
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)

class ToolMomentumView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT repo_full_name, cohort, stage, avg_daily_growth, current_stars
            FROM dbt_dev_gold.tool_momentum_stage
            WHERE status = 'ok'
            ORDER BY stage, avg_daily_growth DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        by_stage = {}
        for r in rows:
            by_stage.setdefault(r['stage'], []).append(r)
        return Response(by_stage)

class SalaryKPISummaryView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT work_year, experience_level, median_salary_usd
            FROM dbt_dev_gold.fact_salary_by_experience
            ORDER BY experience_level, work_year
        """)
        salary_by_experience = cur.fetchall()

        cur.execute("""
            SELECT work_year, remote_ratio, SUM(respondent_count) AS respondent_count
            FROM dbt_dev_gold.fact_remote_ratio_trend
            GROUP BY work_year, remote_ratio
            ORDER BY work_year, remote_ratio
        """)
        remote_ratio_trend = cur.fetchall()

        cur.execute("""
            SELECT work_year, job_title, avg_salary_usd, respondent_count
            FROM dbt_dev_gold.fact_top_paying_title_by_year
            ORDER BY work_year DESC
            LIMIT 1
        """)
        top_paying_title = cur.fetchone()
        cur.close()
        conn.close()
        return Response({
            "salary_by_experience": salary_by_experience,
            "remote_ratio_trend": remote_ratio_trend,
            "top_paying_title": top_paying_title,
        })


class SalaryToolListView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT DISTINCT canonical_tool FROM dbt_dev_gold.fact_salary_by_tool ORDER BY canonical_tool")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response([r['canonical_tool'] for r in rows])


class SalaryByToolView(APIView):
    def get(self, request):
        tool = request.query_params.get('tool')
        if not tool:
            return Response({"error": "tool query param required"}, status=400)
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            SELECT work_year, AVG(avg_salary_usd) AS avg_salary_usd, SUM(respondent_count) AS respondent_count
            FROM dbt_dev_gold.fact_salary_by_tool
            WHERE canonical_tool = %s
            GROUP BY work_year
            ORDER BY work_year
        """, (tool,))
        salary_trend = cur.fetchall()

        cur.execute("""
            SELECT job_title, AVG(avg_salary_usd) AS avg_salary_usd, SUM(respondent_count) AS respondent_count
            FROM dbt_dev_gold.fact_salary_by_tool
            WHERE canonical_tool = %s
            GROUP BY job_title
            ORDER BY avg_salary_usd DESC
        """, (tool,))
        title_breakdown = cur.fetchall()

        cur.execute("""
            SELECT survey_year,
                   SUM(respondent_count)::numeric / NULLIF(SUM(total_respondents), 0) AS usage_pct
            FROM dbt_dev_gold.fact_de_tool_by_country_year
            WHERE canonical_tool = %s
            GROUP BY survey_year
            ORDER BY survey_year
        """, (tool,))
        adoption_trend = cur.fetchall()

        cur.close()
        conn.close()
        return Response({
            "tool": tool,
            "salary_trend": salary_trend,
            "title_breakdown": title_breakdown,
            "adoption_trend": adoption_trend,
        })


class SkillSalaryGrowthView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT canonical_tool, status, years_of_history, growth_rate_per_year, latest_salary, r_squared
            FROM dbt_dev_gold.skill_salary_growth
            ORDER BY growth_rate_per_year DESC NULLS LAST
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)


class SalaryForecastMultiyearView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT experience_level, forecast_year, status, growth_rate_per_year,
                   predicted_salary, lower_bound, upper_bound
            FROM dbt_dev_gold.salary_forecast_multiyear
            ORDER BY experience_level, forecast_year
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        by_level = {}
        for r in rows:
            by_level.setdefault(r['experience_level'], []).append(r)
        return Response(by_level)


class CareerArchetypeView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT job_title, archetype, median_salary_usd, avg_remote_ratio, avg_company_size_score, respondent_count
            FROM dbt_dev_gold.career_archetype
            ORDER BY archetype, median_salary_usd DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return Response(rows)


EXPERIENCE_MAP = {"EN": 0, "MI": 1, "SE": 2, "EX": 3}
SIZE_MAP = {"S": 0, "M": 1, "L": 2}
_predictor_model = None
_title_map = None


def _load_predictor():
    global _predictor_model, _title_map
    if _predictor_model is None:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        _predictor_model = joblib.load(os.path.join(base, 'analytics', 'ml_models', 'salary_predictor.joblib'))
        _title_map = joblib.load(os.path.join(base, 'analytics', 'ml_models', 'title_map.joblib'))
    return _predictor_model, _title_map


class SalaryPredictorMetaView(APIView):
    def get(self, request):
        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT r_squared, mae_usd, trained_on_rows, tested_on_rows FROM dbt_dev_gold.salary_predictor_metadata WHERE id = 1")
        meta = cur.fetchone()
        cur.close()
        conn.close()
        _, title_map = _load_predictor()
        return Response({**meta, "available_titles": sorted(title_map.keys())})


class SalaryPredictorView(APIView):
    def get(self, request):
        experience_level = request.query_params.get('experience_level')
        remote_ratio = request.query_params.get('remote_ratio')
        company_size = request.query_params.get('company_size')
        job_title = request.query_params.get('job_title')
        if not all([experience_level, remote_ratio, company_size, job_title]):
            return Response({"error": "experience_level, remote_ratio, company_size, job_title all required"}, status=400)

        model, title_map = _load_predictor()
        if experience_level not in EXPERIENCE_MAP or company_size not in SIZE_MAP or job_title not in title_map:
            return Response({"error": "invalid input value"}, status=400)

        features = [[EXPERIENCE_MAP[experience_level], int(remote_ratio), SIZE_MAP[company_size], title_map[job_title]]]
        prediction = model.predict(features)[0]

        conn = get_readonly_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT r_squared, mae_usd FROM dbt_dev_gold.salary_predictor_metadata WHERE id = 1")
        meta = cur.fetchone()
        cur.close()
        conn.close()

        return Response({
            "predicted_salary": round(float(prediction)),
            "r_squared": float(meta['r_squared']),
            "mae_usd": float(meta['mae_usd']),
        })