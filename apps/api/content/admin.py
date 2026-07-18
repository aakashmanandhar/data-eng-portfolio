import requests
import base64
from django.contrib import admin
from django.contrib import messages
from .models import CaseStudy, BlogPost, ADR
import re


def fetch_from_github(modeladmin, request, queryset):
    for case_study in queryset:
        if not case_study.github_url:
            modeladmin.message_user(request, f"'{case_study.title}' has no GitHub URL set — skipped.", level=messages.WARNING)
            continue

        try:
            # Parse "owner/repo" out of a URL like https://github.com/owner/repo
            parts = case_study.github_url.rstrip('/').split('/')
            owner, repo = parts[-2], parts[-1]

            # Fetch repo metadata
            repo_resp = requests.get(f"https://api.github.com/repos/{owner}/{repo}", timeout=10)
            repo_resp.raise_for_status()
            repo_data = repo_resp.json()

            # Fetch README (base64-encoded by default)
            readme_resp = requests.get(f"https://api.github.com/repos/{owner}/{repo}/readme", timeout=10)
            readme_resp.raise_for_status()
            readme_data = readme_resp.json()
            readme_text = base64.b64decode(readme_data['content']).decode('utf-8')

            # Rewrite relative image paths (e.g. docs/Architecture.png) to real GitHub raw URLs
            default_branch = repo_data.get('default_branch', 'main')
            def fix_image_path(match):
                alt_text, path = match.group(1), match.group(2)
                if path.startswith('http://') or path.startswith('https://'):
                    return match.group(0)  # already absolute, leave it alone
                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}"
                return f"![{alt_text}]({raw_url})"
            readme_text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', fix_image_path, readme_text)

            # Populate fields — only metadata/README, never problem/architecture/outcome
            if not case_study.summary:
                case_study.summary = (repo_data.get('description') or '')[:300]
            if not case_study.tech_stack:
                topics = repo_data.get('topics', [])
                case_study.tech_stack = ', '.join(topics) if topics else (repo_data.get('language') or '')
            case_study.readme_content = readme_text
            case_study.save()

            modeladmin.message_user(request, f"Imported '{case_study.title}' from GitHub successfully.", level=messages.SUCCESS)

        except Exception as e:
            modeladmin.message_user(request, f"Failed to import '{case_study.title}': {e}", level=messages.ERROR)


fetch_from_github.short_description = "Fetch metadata + README from GitHub"


@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_featured', 'is_published', 'updated_at')
    list_filter = ('is_featured', 'is_published')
    prepopulated_fields = {'slug': ('title',)}
    actions = [fetch_from_github]


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