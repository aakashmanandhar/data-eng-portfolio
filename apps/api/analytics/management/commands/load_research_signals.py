import re
import json
from datetime import datetime, timezone as dt_timezone
from django.core.management.base import BaseCommand
from django.db import connection
from analytics.models import ResearchSignal, ToolAdoptionTrend


def parse_dt(value):
    if not value:
        return None
    try:
        # arXiv format: 2026-08-15T12:00:00Z
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None


class Command(BaseCommand):
    help = "Load bronze research data (papers, repos, HN stories, PyPI trends) into ResearchSignal / ToolAdoptionTrend"

    def handle(self, *args, **options):
        created, updated = 0, 0

        with connection.cursor() as cur:
            # arXiv papers
            cur.execute("SELECT raw_data FROM bronze.research_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="arxiv",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
                        published_at=pub,
                        score=0,
                    ),
                )
                created += was_created
                updated += not was_created

            # GitHub repos
            cur.execute("SELECT raw_data FROM bronze.research_repos")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at")) or datetime.now(dt_timezone.utc)
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="github",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors="",
                        topic_tags=raw.get("topic_tags", "")[:300],
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # Hacker News stories
            cur.execute("SELECT raw_data FROM bronze.research_hn")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at")) or datetime.now(dt_timezone.utc)
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=f"hn-{raw['external_id']}",
                    defaults=dict(
                        source="hackernews",
                        title=raw.get("title", "")[:500],
                        summary="",
                        url=raw.get("url", "")[:500],
                        authors="",
                        topic_tags=raw.get("topic_tags", "")[:300],
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # PyPI trends
            cur.execute("SELECT tool_name, raw_data, snapshot_date FROM bronze.pypi_trends")
            trend_count = 0
            for tool_name, raw, snap_date in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                ToolAdoptionTrend.objects.update_or_create(
                    tool_name=tool_name,
                    snapshot_date=snap_date,
                    defaults=dict(download_count=raw.get("last_month", 0) or 0),
                )
                trend_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"ResearchSignal: {created} created, {updated} updated. ToolAdoptionTrend: {trend_count} upserted."
        ))
