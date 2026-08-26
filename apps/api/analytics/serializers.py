from rest_framework import serializers
from .models import PipelineRun


class PipelineRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineRun
        fields = ['status', 'stage_reached', 'started_at', 'finished_at', 'pipeline_name']
from .models import AgentDiagnosis, DataQualityAction, ResearchSignal, ToolAdoptionTrend


class AgentDiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentDiagnosis
        fields = ['task_id', 'dag_run_id', 'error_summary', 'diagnosis', 'suggested_fix', 'severity', 'auto_retried', 'resolved', 'created_at']


class DataQualityActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataQualityAction
        fields = ['table_name', 'action_type', 'rows_affected', 'confidence', 'reasoning', 'created_at']


class ResearchSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchSignal
        fields = ['source', 'title', 'summary', 'url', 'authors', 'topic_tags', 'published_at', 'score']


class ToolAdoptionTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToolAdoptionTrend
        fields = ['tool_name', 'snapshot_date', 'download_count']


from .models import Experience, ExperienceHighlight, Education, Certification


class HighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperienceHighlight
        fields = ["text"]


class ExperienceSerializer(serializers.ModelSerializer):
    highlights = HighlightSerializer(many=True, read_only=True)
    company_logo = serializers.ImageField(use_url=True, required=False)

    class Meta:
        model = Experience
        fields = ["id", "company", "company_logo", "role", "employment_type",
                  "location", "is_remote", "start_date", "end_date", "skills", "highlights"]


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = "__all__"


class CertificationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Certification
        fields = "__all__"


from .models import Language, Reference, AreaOfExpertise, Profile


class LanguageSerializer(serializers.ModelSerializer):
    proficiency_display = serializers.CharField(source='get_proficiency_display', read_only=True)

    class Meta:
        model = Language
        fields = ["id", "name", "proficiency", "proficiency_display"]


class ReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reference
        fields = ["id", "name", "title", "company"]  # email deliberately excluded from public API


class AreaOfExpertiseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreaOfExpertise
        fields = ["id", "name"]


class ProfileSerializer(serializers.ModelSerializer):
    headshot = serializers.ImageField(use_url=True, required=False)

    class Meta:
        model = Profile
        fields = ["summary", "headshot"]


from .models import KeyAchievement


class KeyAchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeyAchievement
        fields = ["id", "title", "description"]
