from django.urls import path
from .views import CaseStudyListView, BlogPostListView, ADRListView

urlpatterns = [
    path('case-studies/', CaseStudyListView.as_view(), name='case-study-list'),
    path('blog-posts/', BlogPostListView.as_view(), name='blog-post-list'),
    path('adrs/', ADRListView.as_view(), name='adr-list'),
]