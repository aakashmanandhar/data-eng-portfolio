from rest_framework import serializers
from .models import CaseStudy, BlogPost, ADR, ProfileStatus, ContactMessage


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

class ProfileStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileStatus
        fields = ['status', 'now_building', 'resume_pdf', 'about_text', 'profile_photo', 'headline_main', 'subtext', 'updated_at']
        
class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'message']
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'created_at', 'is_read']