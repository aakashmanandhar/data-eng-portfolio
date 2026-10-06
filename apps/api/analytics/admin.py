from django.contrib import admin

# Register your models here.


from .models import Experience, ExperienceHighlight, Education, Certification


class HighlightInline(admin.TabularInline):
    model = ExperienceHighlight
    extra = 1


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ("role", "company", "start_date", "end_date", "is_visible", "include_in_pdf", "order")
    list_editable = ("is_visible", "include_in_pdf")
    inlines = [HighlightInline]
    ordering = ("order", "-start_date")


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ("degree", "institution", "start_date", "end_date")


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("name", "issuer", "status", "issue_date")


from .models import Language, Reference, AreaOfExpertise, Profile, ProfileEmail, ProfilePhone


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ("name", "proficiency", "order")


@admin.register(Reference)
class ReferenceAdmin(admin.ModelAdmin):
    list_display = ("name", "title", "company", "order")


@admin.register(AreaOfExpertise)
class AreaOfExpertiseAdmin(admin.ModelAdmin):
    list_display = ("name", "order")


class ProfileEmailInline(admin.TabularInline):
    model = ProfileEmail
    extra = 1


class ProfilePhoneInline(admin.TabularInline):
    model = ProfilePhone
    extra = 1


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("__str__",)
    fields = ("summary", "headshot", "location", "show_photo_in_pdf")
    inlines = [ProfileEmailInline, ProfilePhoneInline]

    def has_add_permission(self, request):
        return not Profile.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


from .models import KeyAchievement


@admin.register(KeyAchievement)
class KeyAchievementAdmin(admin.ModelAdmin):
    list_display = ("title", "order")
