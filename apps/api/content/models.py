from django.db import models


class CaseStudy(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    summary = models.CharField(max_length=300, help_text="Short teaser shown on the cards")
    problem = models.TextField(help_text="What problem was being solved")
    architecture = models.TextField(help_text="How it was built")
    outcome = models.TextField(help_text="Result / what you'd do differently")
    tech_stack = models.CharField(max_length=300, help_text="Comma-separated, e.g. dbt, Airflow, Terraform")
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title