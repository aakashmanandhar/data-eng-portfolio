from rest_framework import generics
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication
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
    
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return


class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all()
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        instance = serializer.save()
        send_mail(
            subject="Thanks for reaching out — Aakash Manandhar",
            message=(
                f"Hi {instance.name},\n\n"
                "Thanks for your message! I've received it and will get back to you soon.\n\n"
                f"Your message:\n\"{instance.message}\"\n\n"
                "— Aakash"
            ),
            from_email=None,
            recipient_list=[instance.email],
            fail_silently=False,
        )