from django.urls import path
from .views import (
    JobMarketView, OssLandscapeSummaryView, SentimentVsAdoptionGapView, ToolUsageView, ToolPreferenceGlobalView, LastRefreshedView, PipelineRunListView,
    GitHubRepoRankingView, GitHubCohortTrendView, GitHubPlatformComparisonView, GitHubOrgActivityView,
    AIAdoptionForecastView, VisitorCountView, VisitorHeartbeatView, VisitorStatsView, CountryAISignalView, CountryArchetypeView,
    DeToolSummaryView, DeToolByCountryView, OrgArchetypeSummaryView, CountryToolSignalView, ToolListView, 
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
    path('ai-adoption-forecast/', AIAdoptionForecastView.as_view(), name='ai-adoption-forecast'),
    path('visitor-heartbeat/', VisitorHeartbeatView.as_view(), name='visitor-heartbeat'),
    path('visitor-count/', VisitorCountView.as_view(), name='visitor-count'),
    path('visitor-stats/', VisitorStatsView.as_view(), name='visitor-stats'),
    path('country-ai-signal/', CountryAISignalView.as_view(), name='country-ai-signal'),
    path('de-tool-summary/', DeToolSummaryView.as_view(), name='de-tool-summary'),
    path('de-tool-by-country/', DeToolByCountryView.as_view(), name='de-tool-by-country'),
    path('org-archetype-summary/', OrgArchetypeSummaryView.as_view(), name='org-archetype-summary'),
    path('oss-landscape-summary/', OssLandscapeSummaryView.as_view(), name='oss-landscape-summary'),
    path('sentiment-vs-adoption-gap/', SentimentVsAdoptionGapView.as_view(), name='sentiment-vs-adoption-gap'),
    path('country-tool-signal/', CountryToolSignalView.as_view(), name='country-tool-signal'),
    path('tool-list/', ToolListView.as_view(), name='tool-list'),
]