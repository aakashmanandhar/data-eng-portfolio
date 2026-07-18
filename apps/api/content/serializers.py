from rest_framework import serializers
from .models import CaseStudy


class CaseStudySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseStudy
        fields = [
            'id', 'title', 'slug', 'summary', 'problem',
            'architecture', 'outcome', 'tech_stack',
            'is_featured', 'created_at', 'updated_at'
        ]