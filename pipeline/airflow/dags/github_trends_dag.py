from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "aakash",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="github_trends_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2026, 7, 23),
    catchup=False,
    tags=["github", "trends"],
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

    dbt_run = BashOperator(
        task_id="dbt_run",
        bash_command=(
            "docker exec portfolio_dbt dbt run --select "
            "silver_github_repo_snapshot dim_github_repo fact_github_repo_trend "
            "silver_github_org_snapshot fact_github_org_trend dim_github_org"
        ),
    )

    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command=(
            "docker exec portfolio_dbt dbt test --select "
            "fact_github_repo_trend dim_github_repo fact_github_org_trend dim_github_org"
        ),
    )

    extract_fixed >> load_bronze_fixed
    discover_topics >> load_bronze_discovery
    extract_orgs >> load_bronze_orgs
    [load_bronze_fixed, load_bronze_discovery, load_bronze_orgs] >> dbt_run >> dbt_test