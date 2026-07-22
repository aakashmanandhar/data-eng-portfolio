import psycopg2
import psycopg2.extras
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics
from .models import PipelineRun
from .serializers import PipelineRunSerializer


def get_readonly_connection():
    return psycopg2.connect(
        host="portfolio_postgres",
        port=5432,
        dbname="portfolio",
        user="readonly_user",
        password="readonlypass123",
    )


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
    queryset = PipelineRun.objects.all()[:10]