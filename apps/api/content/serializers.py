from rest_framework import serializers
from .models import CaseStudy, BlogPost, ADR


class CaseStudySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseStudy
        fields = [
            'id', 'title', 'slug', 'summary', 'problem',
            'architecture', 'outcome', 'tech_stack',
            'readme_content', 'pdf_document',
            'is_featured', 'created_at', 'updated_at'
        ]


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'body',
            'created_at', 'updated_at'
        ]


class ADRSerializer(serializers.ModelSerializer):
    class Meta:
        model = ADR
        fields = [
            'id', 'title', 'slug', 'context', 'decision',
            'consequences', 'created_at', 'updated_at'
        ]