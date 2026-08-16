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
