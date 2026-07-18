from django.urls import path
from .views import CaseStudyListView

urlpatterns = [
    path('case-studies/', CaseStudyListView.as_view(), name='case-study-list'),
]