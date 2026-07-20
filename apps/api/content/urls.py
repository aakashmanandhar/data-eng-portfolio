from django.urls import path
from .views import CaseStudyListView, CaseStudyDetailView, BlogPostListView, ADRListView, ProfileStatusView, ContactMessageCreateView

urlpatterns = [
    path('case-studies/', CaseStudyListView.as_view(), name='case-study-list'),
    path('case-studies/<slug:slug>/', CaseStudyDetailView.as_view(), name='case-study-detail'),
    path('blog-posts/', BlogPostListView.as_view(), name='blog-post-list'),
    path('adrs/', ADRListView.as_view(), name='adr-list'),
    path('profile-status/', ProfileStatusView.as_view(), name='profile-status'),
    path('contact/', ContactMessageCreateView.as_view(), name='contact'),
]