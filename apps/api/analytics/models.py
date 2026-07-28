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