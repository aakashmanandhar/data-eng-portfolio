"""
Survey Pipelines DAG (SO Survey historical + Practical Data Community).

IMPORTANT - manual trigger only, no automated schedule:
Both data sources are annual survey CSVs with no public API - there is no
URL this DAG can poll to detect a new release. A human must manually
download the new year's CSV and place it in the expected folder
(pipeline/extraction/data/so_survey_historical/{year}.csv, or
pipeline/extraction/survey_2026_data_engineering.csv for the Practical
Data Community survey) BEFORE triggering this DAG. This DAG only automates
the transform/model/forecast steps that run after that manual download,
not the extraction step itself.
"""
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
PipelineRun.objects.create(pipeline_name='survey_pipelines', status='success', stage_reached='complete', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


def notify_failure(context):
    started_at = context['dag_run'].start_date.strftime("%Y-%m-%dT%H:%M:%S")
    failed_task = context['task_instance'].task_id
    cmd = f"""docker exec portfolio_django python manage.py shell -c "
from analytics.models import PipelineRun
from django.utils.dateparse import parse_datetime
PipelineRun.objects.create(pipeline_name='survey_pipelines', status='failure', stage_reached='{failed_task}', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


with DAG(
    dag_id="survey_pipelines",
    default_args=default_args,
    schedule_interval=None,  # manual trigger only - see docstring
    start_date=datetime(2026, 8, 1),
    catchup=False,
    tags=["survey", "de-tools", "org-maturity"],
    on_success_callback=notify_success,
    on_failure_callback=notify_failure,
) as dag:

    dbt_run_so_survey = BashOperator(
        task_id="dbt_run_so_survey",
        bash_command=(
            "docker exec portfolio_dbt dbt run --select "
            "silver_so_survey_historical fact_de_tool_by_country_year fact_de_tool_ranking"
        ),
    )
    dbt_test_so_survey = BashOperator(
        task_id="dbt_test_so_survey",
        bash_command=(
            "docker exec portfolio_dbt dbt test --select "
            "silver_so_survey_historical fact_de_tool_by_country_year fact_de_tool_ranking"
        ),
    )
    forecast_de_tool_adoption = BashOperator(
        task_id="forecast_de_tool_adoption",
        bash_command=(
            "docker cp /repo/pipeline/extraction/forecast_de_tool_adoption.py portfolio_django:/tmp/forecast_de_tool_adoption.py && "
            "docker exec -w /tmp portfolio_django python forecast_de_tool_adoption.py"
        ),
    )

    dbt_run_practical_survey = BashOperator(
        task_id="dbt_run_practical_survey",
        bash_command="docker exec portfolio_dbt dbt run --select silver_practical_data_survey",
    )
    dbt_test_practical_survey = BashOperator(
        task_id="dbt_test_practical_survey",
        bash_command="docker exec portfolio_dbt dbt test --select silver_practical_data_survey",
    )
    cluster_org_maturity = BashOperator(
        task_id="cluster_org_maturity",
        bash_command=(
            "docker cp /repo/pipeline/extraction/cluster_org_maturity.py portfolio_django:/tmp/cluster_org_maturity.py && "
            "docker exec -w /tmp portfolio_django python cluster_org_maturity.py"
        ),
    )

    # Two independent branches, explicitly chained end-to-end (no ambiguity
    # about task ordering, unlike relying on implicit Airflow defaults).
    dbt_run_so_survey >> dbt_test_so_survey >> forecast_de_tool_adoption
    dbt_run_practical_survey >> dbt_test_practical_survey >> cluster_org_maturity