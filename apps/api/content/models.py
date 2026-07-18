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
    
class BlogPost(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    excerpt = models.CharField(max_length=300, help_text="Short teaser shown on the cards")
    body = models.TextField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
    
class ADR(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    context = models.TextField(help_text="What situation led to this decision")
    decision = models.TextField(help_text="What was decided")
    consequences = models.TextField(help_text="Trade-offs and results")
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "ADR"
        verbose_name_plural = "ADRs"

    def __str__(self):
        return self.title