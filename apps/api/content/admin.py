from django.contrib import admin
from .models import CaseStudy, BlogPost, ADR


@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_featured', 'is_published', 'updated_at')
    list_filter = ('is_featured', 'is_published')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_published', 'updated_at')
    list_filter = ('is_published',)
    prepopulated_fields = {'slug': ('title',)}


@admin.register(ADR)
class ADRAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_published', 'updated_at')
    list_filter = ('is_published',)
    prepopulated_fields = {'slug': ('title',)}