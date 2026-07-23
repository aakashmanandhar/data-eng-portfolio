from django.urls import path
from .views import (
    JobMarketView, ToolUsageView, ToolPreferenceGlobalView, LastRefreshedView, PipelineRunListView,
    GitHubRepoRankingView, GitHubCohortTrendView, GitHubPlatformComparisonView, GitHubOrgActivityView,
)

urlpatterns = [
    path('job-market/', JobMarketView.as_view(), name='job-market'),
    path('tool-usage/', ToolUsageView.as_view(), name='tool-usage'),
    path('tool-preference-global/', ToolPreferenceGlobalView.as_view(), name='tool-preference-global'),
    path('last-refreshed/', LastRefreshedView.as_view(), name='last-refreshed'),
    path('pipeline-runs/', PipelineRunListView.as_view(), name='pipeline-runs'),
    path('github-repos/', GitHubRepoRankingView.as_view(), name='github-repos'),
    path('github-cohort-trend/', GitHubCohortTrendView.as_view(), name='github-cohort-trend'),
    path('github-platforms/', GitHubPlatformComparisonView.as_view(), name='github-platforms'),
    path('github-orgs/', GitHubOrgActivityView.as_view(), name='github-orgs'),
]