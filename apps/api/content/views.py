from rest_framework import generics
from django.core.mail import EmailMultiAlternatives
import os
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

        plain_text = (
            f"Hi {instance.name},\n\n"
            "Thanks for your message! I've received it and will get back to you soon.\n\n"
            f"Your message:\n\"{instance.message}\"\n\n"
            "— Aakash"
        )

        html_content = f"""
        <html>
        <body style="margin:0; padding:0; background:#f4f7fb; font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:32px 16px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(20,40,80,0.08);">
                <tr><td>
                  <img src="cid:banner_image" alt="Aakash Manandhar - Data Engineer" width="560" style="display:block; width:100%; height:auto;">
                </td></tr>
                <tr><td style="height:3px; background:linear-gradient(90deg,#2563EB,#06B6D4,#F97316,#DB2777);"></td></tr>
                <tr><td style="padding:32px 36px;">
                  <h2 style="margin:0 0 16px; font-size:20px; color:#131A2B;">Hi {instance.name},</h2>
                  <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#475569;">
                    Thanks for reaching out! I've received your message and will get back to you soon.
                  </p>
                  <div style="background:#f7f9fc; border-left:3px solid #2563EB; border-radius:6px; padding:14px 18px; margin-bottom:24px;">
                    <p style="margin:0; font-size:13px; color:#64748B; font-style:italic; line-height:1.6;">"{instance.message}"</p>
                  </div>
                  <p style="margin:0; font-size:14px; color:#131A2B;">
                    — Aakash Manandhar<br>
                    <a href="https://aakashmanandhar.tech" style="color:#2563EB; text-decoration:none; font-size:13px;">aakashmanandhar.tech</a>
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """

        email = EmailMultiAlternatives(
            subject="Thanks for reaching out — Aakash Manandhar",
            body=plain_text,
            from_email=None,
            to=[instance.email],
        )
        email.attach_alternative(html_content, "text/html")

        banner_path = os.path.join(os.path.dirname(__file__), "assets", "banner.jpeg")
        if os.path.exists(banner_path):
            with open(banner_path, "rb") as f:
                from email.mime.image import MIMEImage
                img = MIMEImage(f.read())
                img.add_header("Content-ID", "<banner_image>")
                img.add_header("Content-Disposition", "inline", filename="banner.jpeg")
                email.attach(img)

        email.send(fail_silently=True)
