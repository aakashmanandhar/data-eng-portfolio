from django.db import models
from django.utils import timezone

class VisitorSession(models.Model):
    session_id = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(default=timezone.now)


class PipelineRun(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
    ]
    pipeline_name = models.CharField(max_length=50, default='job_market')  # 'job_market' or 'github_trends'
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    stage_reached = models.CharField(max_length=50, blank=True)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-finished_at']

class VisitorSession(models.Model):
    session_id = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(default=timezone.now)

class ResearchSignal(models.Model):
    SOURCE_CHOICES = [
        ('arxiv', 'arXiv'),
        ('github', 'GitHub'),
        ('hackernews', 'Hacker News'),
        ('semantic_scholar', 'Semantic Scholar'),
        ('openalex', 'OpenAlex'),
        ('crossref', 'Crossref'),
        ('dblp', 'DBLP'),
        ('hf_papers', 'Hugging Face Papers'),
        ('zenodo', 'Zenodo'),
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    external_id = models.CharField(max_length=200, unique=True)  # arxiv id, repo full_name, or HN item id
    title = models.CharField(max_length=500)
    summary = models.TextField(blank=True)
    url = models.URLField(max_length=500)
    authors = models.CharField(max_length=500, blank=True)  # arxiv only
    topic_tags = models.CharField(max_length=300, blank=True)  # comma-separated, matched keywords
    published_at = models.DateTimeField()
    score = models.IntegerField(default=0)  # HN points / GitHub stars, 0 for arxiv
    fetched_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-published_at']

class ToolAdoptionTrend(models.Model):
    tool_name = models.CharField(max_length=100)  # e.g. 'dbt-core', 'dagster', 'langchain'
    snapshot_date = models.DateField()
    download_count = models.BigIntegerField()
    class Meta:
        unique_together = ('tool_name', 'snapshot_date')
        ordering = ['-snapshot_date']

class AgentDiagnosis(models.Model):
    SEVERITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]
    task_id = models.CharField(max_length=100)
    dag_run_id = models.CharField(max_length=150, blank=True)
    error_summary = models.TextField()
    diagnosis = models.TextField()  # LLM-generated root cause
    suggested_fix = models.TextField(blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    auto_retried = models.BooleanField(default=False)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']

class DataQualityAction(models.Model):
    ACTION_CHOICES = [
        ('dedup', 'Deduplication'),
        ('null_fill', 'Null Fill'),
        ('outlier_flag', 'Outlier Flagged'),
        ('schema_drift', 'Schema Drift Detected'),
    ]
    table_name = models.CharField(max_length=100)
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    rows_affected = models.IntegerField(default=0)
    confidence = models.FloatField(default=0.0)  # 0-1, agent's confidence in the auto-fix
    reasoning = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']