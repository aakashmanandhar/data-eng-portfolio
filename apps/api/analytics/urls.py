from django.urls import path
from .views import JobMarketView, ToolUsageView, ToolPreferenceGlobalView, LastRefreshedView

urlpatterns = [
    path('job-market/', JobMarketView.as_view(), name='job-market'),
    path('tool-usage/', ToolUsageView.as_view(), name='tool-usage'),
    path('tool-preference-global/', ToolPreferenceGlobalView.as_view(), name='tool-preference-global'),
    path('last-refreshed/', LastRefreshedView.as_view(), name='last-refreshed'),
]