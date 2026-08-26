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

class Experience(models.Model):
    EMPLOYMENT_TYPES = [
        ("full_time", "Full-time"), ("part_time", "Part-time"),
        ("freelance", "Freelance"), ("contract", "Contract"),
    ]
    company = models.CharField(max_length=200)
    company_logo = models.ImageField(upload_to="logos/", blank=True, null=True)
    role = models.CharField(max_length=200)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES, default="full_time")
    location = models.CharField(max_length=200, blank=True)
    is_remote = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    skills = models.JSONField(default=list, blank=True)
    include_in_pdf = models.BooleanField(default=True, help_text="Show this role in the downloadable CV PDF")
    is_visible = models.BooleanField(default=True, help_text="Show this role on the website")

    class Meta:
        ordering = ["order", "-start_date"]

    def __str__(self):
        return f"{self.role} @ {self.company}"


class ExperienceHighlight(models.Model):
    experience = models.ForeignKey(Experience, related_name="highlights", on_delete=models.CASCADE)
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.text[:50]


class Education(models.Model):
    institution = models.CharField(max_length=200)
    logo = models.ImageField(upload_to="logos/", blank=True, null=True)
    degree = models.CharField(max_length=300)
    field_of_study = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    thesis_or_note = models.CharField(max_length=300, blank=True)
    skills = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "-start_date"]

    def __str__(self):
        return f"{self.degree} - {self.institution}"


class Certification(models.Model):
    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("in_progress", "In Progress"),
    ]
    name = models.CharField(max_length=300)
    issuer = models.CharField(max_length=200)
    issuer_logo = models.ImageField(upload_to="logos/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="completed")
    issue_date = models.DateField(null=True, blank=True)
    target_date_note = models.CharField(max_length=200, blank=True, help_text="e.g. 'Exam in February 2026'")
    credential_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "-issue_date"]

    def __str__(self):
        return self.name

class Language(models.Model):
    PROFICIENCY_CHOICES = [
        ("native", "Native"),
        ("full_professional", "Full Professional Proficiency"),
        ("professional", "Professional Working Proficiency"),
        ("intermediate", "Intermediate"),
        ("basic", "Basic"),
    ]
    name = models.CharField(max_length=100)
    proficiency = models.CharField(max_length=30, choices=PROFICIENCY_CHOICES)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.name} ({self.get_proficiency_display()})"


class Reference(models.Model):
    name = models.CharField(max_length=200)
    title = models.CharField(max_length=200, blank=True)
    company = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class AreaOfExpertise(models.Model):
    MAX_ITEMS = 8

    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Areas of expertise"

    def __str__(self):
        return self.name

    def clean(self):
        from django.core.exceptions import ValidationError
        existing_count = AreaOfExpertise.objects.exclude(pk=self.pk).count()
        if existing_count >= self.MAX_ITEMS:
            raise ValidationError(
                f"Maximum of {self.MAX_ITEMS} areas of expertise allowed. "
                f"Delete an existing one before adding a new one."
            )


class Profile(models.Model):
    summary = models.TextField(help_text="Professional summary / about-me paragraph")
    headshot = models.ImageField(upload_to="headshot/", blank=True, null=True)

    class Meta:
        verbose_name_plural = "Profile"

    def __str__(self):
        return "Profile"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class KeyAchievement(models.Model):
    MAX_ITEMS = 2

    title = models.CharField(max_length=200)
    description = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title

    def clean(self):
        from django.core.exceptions import ValidationError
        existing_count = KeyAchievement.objects.exclude(pk=self.pk).count()
        if existing_count >= self.MAX_ITEMS:
            raise ValidationError(
                f"Maximum of {self.MAX_ITEMS} key achievements allowed. "
                f"Delete an existing one before adding a new one."
            )
