from django.db import models
from pgvector.django import VectorField


class Embedding(models.Model):
    SOURCE_CHOICES = [
        ('case_study', 'Case Study'),
        ('blog_post', 'Blog Post'),
        ('adr', 'ADR'),
    ]

    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_id = models.IntegerField(help_text="ID of the CaseStudy/BlogPost/ADR this chunk came from")
    chunk_text = models.TextField(help_text="The actual text chunk that was embedded")
    embedding = VectorField(dimensions=1536, help_text="Vector representation of chunk_text")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_type} #{self.source_id} chunk"