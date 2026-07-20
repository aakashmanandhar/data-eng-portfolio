from rest_framework import generics
from .models import CaseStudy, BlogPost, ADR, ProfileStatus, ContactMessage
from .serializers import CaseStudySerializer, BlogPostSerializer, ADRSerializer, ProfileStatusSerializer, ContactMessageSerializer

class CaseStudyListView(generics.ListAPIView):
    serializer_class = CaseStudySerializer

    def get_queryset(self):
        return CaseStudy.objects.filter(is_published=True)
    
class CaseStudyDetailView(generics.RetrieveAPIView):
    serializer_class = CaseStudySerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return CaseStudy.objects.filter(is_published=True)


class BlogPostListView(generics.ListAPIView):
    serializer_class = BlogPostSerializer

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True)


class ADRListView(generics.ListAPIView):
    serializer_class = ADRSerializer

    def get_queryset(self):
        return ADR.objects.filter(is_published=True)
    
class ProfileStatusView(generics.RetrieveAPIView):
    serializer_class = ProfileStatusSerializer

    def get_object(self):
        obj, created = ProfileStatus.objects.get_or_create(
            pk=1,
            defaults={
                'status': 'active',
                'now_building': 'Live tools & salary explorer + RAG assistant — Django, React, PostgreSQL, Jenkins, dbt, Terraform, Docker.',
                'headline_main': 'Architecting the data infrastructure behind reliable pipelines.',
                'subtext': 'I build production-grade ETL/ELT pipelines, and I run a live end-to-end pipeline.',
            }
        )
        return obj
    
class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all()