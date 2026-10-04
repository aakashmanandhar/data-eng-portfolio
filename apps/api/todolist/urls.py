from django.urls import path
from .views import TodoVerifyView, TodayView, ToggleView, SummaryView, NutritionSaveView, HealthSummaryView, WeeklyReviewView, ProjectionView

urlpatterns = [
    path('todolist/verify/', TodoVerifyView.as_view(), name='todolist-verify'),
    path('todolist/today/', TodayView.as_view(), name='todolist-today'),
    path('todolist/toggle/', ToggleView.as_view(), name='todolist-toggle'),
    path('todolist/summary/', SummaryView.as_view(), name='todolist-summary'),
    path('todolist/nutrition/', NutritionSaveView.as_view(), name='todolist-nutrition'),
    path('todolist/health-summary/', HealthSummaryView.as_view(), name='todolist-health-summary'),
    path('todolist/weekly-review/', WeeklyReviewView.as_view(), name='todolist-weekly-review'),
    path('todolist/projection/', ProjectionView.as_view(), name='todolist-projection'),
]
