from django.urls import path
from .views import JobMarketView, ToolUsageView

urlpatterns = [
    path('job-market/', JobMarketView.as_view(), name='job-market'),
    path('tool-usage/', ToolUsageView.as_view(), name='tool-usage'),
]