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
PipelineRun.objects.create(pipeline_name='salary_pipeline', status='success', stage_reached='dbt_test', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


def notify_failure(context):
    started_at = context['dag_run'].start_date.strftime("%Y-%m-%dT%H:%M:%S")
    failed_task = context['task_instance'].task_id
    cmd = f"""docker exec portfolio_django python manage.py shell -c "
from analytics.models import PipelineRun
from django.utils.dateparse import parse_datetime
PipelineRun.objects.create(pipeline_name='salary_pipeline', status='failure', stage_reached='{failed_task}', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


with DAG(
    dag_id="salary_pipeline",
    default_args=default_args,
    schedule_interval="@weekly",  # matches the source's own real update cadence
    start_date=datetime(2026, 8, 6),
    catchup=False,
    tags=["salary", "careers"],
    on_success_callback=notify_success,
    on_failure_callback=notify_failure,
) as dag:

    extract = BashOperator(
        task_id="extract_ai_jobs_salaries",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_ai_jobs_salaries.py portfolio_django:/tmp/extract_ai_jobs_salaries.py && "
            "docker exec -w /tmp portfolio_django python extract_ai_jobs_salaries.py"
        ),
    )
    load_bronze = BashOperator(
        task_id="load_bronze_ai_jobs_salaries",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_ai_jobs_salaries.py portfolio_django:/tmp/load_bronze_ai_jobs_salaries.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_ai_jobs_salaries.py"
        ),
    )
    dbt_run = BashOperator(
        task_id="dbt_run",
        bash_command=(
            "docker exec portfolio_dbt dbt run --select "
            "silver_ai_jobs_salaries fact_salary_by_tool fact_salary_by_experience "
            "fact_remote_ratio_trend fact_top_paying_title_by_year"
        ),
    )
    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command=(
            "docker exec portfolio_dbt dbt test --select "
            "silver_ai_jobs_salaries fact_salary_by_experience fact_salary_by_tool fact_top_paying_title_by_year"
        ),
    )

    extract >> load_bronze >> dbt_run >> dbt_test