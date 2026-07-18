from rest_framework import generics
from .models import CaseStudy, BlogPost, ADR
from .serializers import CaseStudySerializer, BlogPostSerializer, ADRSerializer


class CaseStudyListView(generics.ListAPIView):
    serializer_class = CaseStudySerializer

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