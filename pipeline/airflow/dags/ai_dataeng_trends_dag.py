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
PipelineRun.objects.create(pipeline_name='ai_dataeng_trends', status='success', stage_reached='load_research_signals', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


def notify_failure(context):
    started_at = context['dag_run'].start_date.strftime("%Y-%m-%dT%H:%M:%S")
    failed_task = context['task_instance'].task_id
    cmd = f"""docker exec portfolio_django python manage.py shell -c "
from analytics.models import PipelineRun
from django.utils.dateparse import parse_datetime
PipelineRun.objects.create(pipeline_name='ai_dataeng_trends', status='failure', stage_reached='{failed_task}', started_at=parse_datetime('{started_at}'))
" """
    subprocess.run(cmd, shell=True)


def diagnose_failure(context):
    """Self-healing agent callback: diagnoses the failure via Gemini, logs it, and
    if the diagnosis judges the error genuinely safe to retry (transient/network/
    rate-limit), actually re-runs the failed task via the Airflow CLI - a real
    action, not just a label."""
    failed_task = context['task_instance'].task_id
    dag_run_id = context['dag_run'].run_id
    dag_id = context['dag'].dag_id
    execution_date = context['ds']
    exception = str(context.get('exception', 'Unknown error'))[:1500].replace('"', "'").replace('\n', ' ')
    cmd = (
        f"docker cp /repo/pipeline/extraction/diagnose_task_failure.py portfolio_django:/tmp/diagnose_task_failure.py && "
        f"docker exec -e GEMINI_API_KEY=$(grep GEMINI_API_KEY /repo/.env | cut -d '=' -f2) "
        f"-w /tmp portfolio_django python diagnose_task_failure.py \"{failed_task}\" \"{dag_run_id}\" \"{exception}\""
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    output = (result.stdout or "") + (result.stderr or "")

    if "AUTO_RETRY_DECISION:True" in output:
        try:
            retry_cmd = [
                "airflow", "tasks", "clear", dag_id,
                "-s", execution_date, "-e", execution_date,
                "-t", failed_task, "-f", "-y",
            ]
            subprocess.run(retry_cmd, check=False)
            print(f"Self-healing: real retry triggered for {failed_task} on {execution_date}")
        except Exception as e:
            print(f"Self-healing: retry attempt failed to trigger: {e}")


with DAG(
    dag_id="ai_dataeng_trends_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2026, 8, 16),
    catchup=False,
    tags=["ai", "data-engineering", "research", "self-healing"],
    on_success_callback=notify_success,
    on_failure_callback=notify_failure,
) as dag:

    extract_papers = BashOperator(
        task_id="extract_research_papers",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_research_papers.py portfolio_django:/tmp/extract_research_papers.py && "
            "docker exec -w /tmp portfolio_django python extract_research_papers.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_papers = BashOperator(
        task_id="load_bronze_research_papers",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_research_papers.py portfolio_django:/tmp/load_bronze_research_papers.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_research_papers.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_repos = BashOperator(
        task_id="extract_research_repos",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_research_repos.py portfolio_django:/tmp/extract_research_repos.py && "
            "docker exec -e GITHUB_TOKEN=$(grep GITHUB_TOKEN /repo/.env | cut -d '=' -f2) -w /tmp portfolio_django python extract_research_repos.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_repos = BashOperator(
        task_id="load_bronze_research_repos",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_research_repos.py portfolio_django:/tmp/load_bronze_research_repos.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_research_repos.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_hn = BashOperator(
        task_id="extract_research_hn",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_research_hn.py portfolio_django:/tmp/extract_research_hn.py && "
            "docker exec -w /tmp portfolio_django python extract_research_hn.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_hn = BashOperator(
        task_id="load_bronze_research_hn",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_research_hn.py portfolio_django:/tmp/load_bronze_research_hn.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_research_hn.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_pypi = BashOperator(
        task_id="extract_pypi_trends",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_pypi_trends.py portfolio_django:/tmp/extract_pypi_trends.py && "
            "docker exec -w /tmp portfolio_django python extract_pypi_trends.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_pypi = BashOperator(
        task_id="load_bronze_pypi_trends",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_pypi_trends.py portfolio_django:/tmp/load_bronze_pypi_trends.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_pypi_trends.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_semantic_scholar = BashOperator(
        task_id="extract_semantic_scholar",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_semantic_scholar.py portfolio_django:/tmp/extract_semantic_scholar.py && "
            "docker exec -w /tmp portfolio_django python extract_semantic_scholar.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_semantic_scholar = BashOperator(
        task_id="load_bronze_semantic_scholar",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_semantic_scholar.py portfolio_django:/tmp/load_bronze_semantic_scholar.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_semantic_scholar.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_openalex = BashOperator(
        task_id="extract_openalex",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_openalex.py portfolio_django:/tmp/extract_openalex.py && "
            "docker exec -w /tmp portfolio_django python extract_openalex.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_openalex = BashOperator(
        task_id="load_bronze_openalex",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_openalex.py portfolio_django:/tmp/load_bronze_openalex.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_openalex.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_crossref = BashOperator(
        task_id="extract_crossref",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_crossref.py portfolio_django:/tmp/extract_crossref.py && "
            "docker exec -w /tmp portfolio_django python extract_crossref.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_crossref = BashOperator(
        task_id="load_bronze_crossref",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_crossref.py portfolio_django:/tmp/load_bronze_crossref.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_crossref.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_dblp = BashOperator(
        task_id="extract_dblp",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_dblp.py portfolio_django:/tmp/extract_dblp.py && "
            "docker exec -w /tmp portfolio_django python extract_dblp.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_dblp = BashOperator(
        task_id="load_bronze_dblp",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_dblp.py portfolio_django:/tmp/load_bronze_dblp.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_dblp.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_hf_papers = BashOperator(
        task_id="extract_hf_papers",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_hf_papers.py portfolio_django:/tmp/extract_hf_papers.py && "
            "docker exec -w /tmp portfolio_django python extract_hf_papers.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_hf_papers = BashOperator(
        task_id="load_bronze_hf_papers",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_hf_papers.py portfolio_django:/tmp/load_bronze_hf_papers.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_hf_papers.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    extract_zenodo = BashOperator(
        task_id="extract_zenodo",
        bash_command=(
            "docker cp /repo/pipeline/extraction/extract_zenodo.py portfolio_django:/tmp/extract_zenodo.py && "
            "docker exec -w /tmp portfolio_django python extract_zenodo.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_zenodo = BashOperator(
        task_id="load_bronze_zenodo",
        bash_command=(
            "docker cp /repo/pipeline/extraction/load_bronze_zenodo.py portfolio_django:/tmp/load_bronze_zenodo.py && "
            "docker exec -w /tmp portfolio_django python load_bronze_zenodo.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    dbt_run = BashOperator(
        task_id="dbt_run",
        bash_command="docker exec portfolio_dbt dbt run --select silver_research_papers silver_research_repos silver_research_hn silver_pypi_trends silver_semantic_scholar_papers silver_openalex_papers silver_crossref_papers silver_dblp_papers silver_hf_papers silver_zenodo_papers dim_research_source dim_research_topic fact_research_signal fact_tool_adoption",
        on_failure_callback=diagnose_failure,
    )
    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command="docker exec portfolio_dbt dbt test --select silver_research_papers silver_research_repos silver_research_hn silver_pypi_trends silver_semantic_scholar_papers silver_openalex_papers silver_crossref_papers silver_dblp_papers silver_hf_papers silver_zenodo_papers dim_research_source dim_research_topic fact_research_signal fact_tool_adoption",
        on_failure_callback=diagnose_failure,
    )
    check_data_quality = BashOperator(
        task_id="check_data_quality",
        bash_command=(
            "docker cp /repo/pipeline/extraction/check_data_quality.py portfolio_django:/tmp/check_data_quality.py && "
            "docker exec -e INTERNAL_API_BASE=http://portfolio_django:8000 -w /tmp portfolio_django python check_data_quality.py"
        ),
        on_failure_callback=diagnose_failure,
    )
    load_research_signals = BashOperator(
        task_id="load_research_signals",
        bash_command="docker exec portfolio_django python manage.py load_research_signals",
        on_failure_callback=diagnose_failure,
    )

    extract_papers >> load_papers
    extract_repos >> load_repos
    extract_hn >> load_hn
    extract_pypi >> load_pypi
    extract_semantic_scholar >> load_semantic_scholar
    extract_openalex >> load_openalex
    extract_crossref >> load_crossref
    extract_dblp >> load_dblp
    extract_hf_papers >> load_hf_papers
    extract_zenodo >> load_zenodo
    [load_papers, load_repos, load_hn, load_pypi, load_semantic_scholar, load_openalex, load_crossref, load_dblp, load_hf_papers, load_zenodo] >> dbt_run >> dbt_test >> check_data_quality >> load_research_signals
