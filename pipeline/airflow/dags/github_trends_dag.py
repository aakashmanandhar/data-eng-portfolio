from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
import subprocess

default_args = {
    "owner": "aakash",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

def notify_success(context):
    started_at = context['dag_run'].start_date.strftime("%Y-%m-%dT%H:%M:%S")
    cmd = f"""docker exec portfolio_django python manage.py shell -c "
from analytics.models import PipelineRun
from django.utils.dateparse import parse_datetime
PipelineRun.objects.create(pipeline_name='github_trends', status='success', stage_reached='forecast_ai_adoption', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


def notify_failure(context):
    started_at = context['dag_run'].start_date.strftime("%Y-%m-%dT%H:%M:%S")
    failed_task = context['task_instance'].task_id
    cmd = f"""docker exec portfolio_django python manage.py shell -c "
from analytics.models import PipelineRun
from django.utils.dateparse import parse_datetime
PipelineRun.objects.create(pipeline_name='github_trends', status='failure', stage_reached='{failed_task}', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)

with DAG(
    dag_id="github_trends_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2026, 7, 23),
    catchup=False,
    tags=["github", "trends"],
    on_success_callback=notify_success,
    on_failure_callback=notify_failure,
) as dag:

    extract_fixed = BashOperator(
        task_id="extract_github_fixed",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_github.py portfolio_django:/tmp/extract_github.py && "
            "docker cp /repo/.env portfolio_django:/tmp/.env && "
            "docker exec -w /tmp portfolio_django python extract_github.py"
        ),
    )

    discover_topics = BashOperator(
        task_id="discover_github_topics",
        bash_command=(
            "docker cp /repo/pipeline/extraction/discover_github_topics.py portfolio_django:/tmp/discover_github_topics.py && "
            "docker exec -w /tmp portfolio_django python discover_github_topics.py"
        ),
    )

    extract_orgs = BashOperator(
        task_id="extract_github_orgs",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_github_orgs.py portfolio_django:/tmp/extract_github_orgs.py && "
            "docker exec -w /tmp portfolio_django python extract_github_orgs.py"
        ),
    )
    
    extract_arxiv = BashOperator(
        task_id="extract_arxiv",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_arxiv.py portfolio_django:/tmp/extract_arxiv.py && "
            "docker exec -w /tmp portfolio_django python extract_arxiv.py"
        ),
    )

    extract_hackernews = BashOperator(
        task_id="extract_hackernews",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_hackernews.py portfolio_django:/tmp/extract_hackernews.py && "
            "docker exec -w /tmp portfolio_django python extract_hackernews.py"
        ),
    )

    extract_oss_insight = BashOperator(
        task_id="extract_oss_insight",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_oss_insight.py portfolio_django:/tmp/extract_oss_insight.py && "
            "docker exec -w /tmp portfolio_django python extract_oss_insight.py"
        ),
    )

    load_bronze_fixed = BashOperator(
        task_id="load_bronze_github_fixed",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_github.py portfolio_django:/tmp/load_bronze_github.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_github.py"
        ),
    )

    load_bronze_discovery = BashOperator(
        task_id="load_bronze_github_discovery",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_github_discovery.py portfolio_django:/tmp/load_bronze_github_discovery.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_github_discovery.py"
        ),
    )

    load_bronze_orgs = BashOperator(
        task_id="load_bronze_github_orgs",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_github_orgs.py portfolio_django:/tmp/load_bronze_github_orgs.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_github_orgs.py"
        ),
    )

    load_bronze_arxiv = BashOperator(
        task_id="load_bronze_arxiv",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_arxiv.py portfolio_django:/tmp/load_bronze_arxiv.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_arxiv.py"
        ),
    )

    load_bronze_hackernews = BashOperator(
        task_id="load_bronze_hackernews",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_hackernews.py portfolio_django:/tmp/load_bronze_hackernews.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_hackernews.py"
        ),
    )

    load_bronze_oss_insight = BashOperator(
        task_id="load_bronze_oss_insight",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_oss_insight.py portfolio_django:/tmp/load_bronze_oss_insight.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_oss_insight.py"
        ),
    )

    dbt_run = BashOperator(
        task_id="dbt_run",
        bash_command=(
            "docker exec portfolio_dbt dbt run --select "
            "silver_github_repo_snapshot dim_github_repo fact_github_repo_trend "
            "silver_github_org_snapshot fact_github_org_trend dim_github_org "
            "silver_arxiv_snapshot silver_hackernews_snapshot fact_ai_adoption_signal "
            "silver_oss_insight_stargazers fact_country_ai_signal fact_country_tool_signal "
            "silver_news_articles dim_keyword dim_source fact_keyword_mention"
        ),
    )

    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command=(
            "docker exec portfolio_dbt dbt test --select "
            "fact_github_repo_trend dim_github_repo fact_github_org_trend dim_github_org "
            "fact_ai_adoption_signal fact_country_ai_signal fact_country_tool_signal"
        ),
    )

    forecast_ai_adoption = BashOperator(
        task_id="forecast_ai_adoption",
        bash_command=(
            "docker cp /repo/pipeline/extraction/forecast_ai_adoption.py portfolio_django:/tmp/forecast_ai_adoption.py && "
            "docker exec -w /tmp portfolio_django python forecast_ai_adoption.py"
        ),
    )

    cluster_tool_co_adoption = BashOperator(
        task_id="cluster_tool_co_adoption",
        bash_command=(
            "docker cp /repo/pipeline/extraction/cluster_tool_co_adoption.py portfolio_django:/tmp/cluster_tool_co_adoption.py && "
            "docker exec -w /tmp portfolio_django python cluster_tool_co_adoption.py"
        ),
    )

    extract_de_ai_news = BashOperator(
    task_id="extract_de_ai_news",
    bash_command=(
        "docker cp /repo/pipeline/extraction/extract_de_ai_news.py portfolio_django:/tmp/extract_de_ai_news.py && "
        "docker exec -e CURRENTS_API_KEY=$(grep CURRENTS_API_KEY /repo/.env | cut -d '=' -f2) -w /tmp portfolio_django python extract_de_ai_news.py"
        ),
    )

    load_bronze_de_ai_news = BashOperator(
    task_id="load_bronze_de_ai_news",
    bash_command=(
        "docker cp /repo/pipeline/extraction/load_bronze_de_ai_news.py portfolio_django:/tmp/load_bronze_de_ai_news.py && "
        "docker exec -w /tmp portfolio_django python load_bronze_de_ai_news.py"
        ),
    )
    score_news_sentiment = BashOperator(
    task_id="score_news_sentiment",
    bash_command=(
        "docker cp /repo/pipeline/extraction/score_news_sentiment.py portfolio_django:/tmp/score_news_sentiment.py && "
        "docker exec -e HUGGINGFACE_API_KEY=$(grep HUGGINGFACE_API_KEY /repo/.env | cut -d '=' -f2) -w /tmp portfolio_django python score_news_sentiment.py"
        ),
    )
    dbt_run_sentiment_trend = BashOperator(
        task_id="dbt_run_sentiment_trend",
        bash_command="docker exec portfolio_dbt dbt run --select fact_keyword_sentiment_trend",
    )
    news_keyword_growth = BashOperator(
        task_id="news_keyword_growth",
        bash_command=(
            "docker cp /repo/pipeline/extraction/news_keyword_growth.py portfolio_django:/tmp/news_keyword_growth.py && "
            "docker exec -w /tmp portfolio_django python news_keyword_growth.py"
        ),
    )
    news_keyword_breakout = BashOperator(
        task_id="news_keyword_breakout",
        bash_command=(
            "docker cp /repo/pipeline/extraction/news_keyword_breakout.py portfolio_django:/tmp/news_keyword_breakout.py && "
            "docker exec -w /tmp portfolio_django python news_keyword_breakout.py"
        ),
    )

    extract_fixed >> load_bronze_fixed
    discover_topics >> load_bronze_discovery
    extract_orgs >> load_bronze_orgs
    extract_arxiv >> load_bronze_arxiv
    extract_hackernews >> load_bronze_hackernews
    extract_oss_insight >> load_bronze_oss_insight
    extract_de_ai_news >> load_bronze_de_ai_news
    [load_bronze_fixed, load_bronze_discovery, load_bronze_orgs, load_bronze_arxiv, load_bronze_hackernews, load_bronze_oss_insight, load_bronze_de_ai_news] >> dbt_run >> dbt_test >> [forecast_ai_adoption, cluster_tool_co_adoption, score_news_sentiment]
    score_news_sentiment >> dbt_run_sentiment_trend >> [news_keyword_growth, news_keyword_breakout]