from django.db import models


class PipelineRun(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    stage_reached = models.CharField(max_length=50, blank=True)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-finished_at']

    def __str__(self):
        return f"{self.status} @ {self.finished_at}"