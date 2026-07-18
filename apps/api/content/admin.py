from django.contrib import admin
from .models import CaseStudy


@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_featured', 'is_published', 'updated_at')
    list_filter = ('is_featured', 'is_published')
    prepopulated_fields = {'slug': ('title',)}