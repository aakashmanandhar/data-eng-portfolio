import re
import json
from datetime import datetime, timezone as dt_timezone, timedelta
from django.core.management.base import BaseCommand
from django.db import connection
from analytics.models import ResearchSignal, ToolAdoptionTrend


def parse_dt(value):
    if not value:
        return None
    try:
        # arXiv format: 2026-08-15T12:00:00Z; other sources may give a plain
        # date like 2026-08-15 with no timezone - always attach UTC so we
        # never save an ambiguous naive datetime.
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dt_timezone.utc)
        # Several sources' metadata carries implausible future dates -
        # some clearly garbage (year 2121/2200 from Crossref), others a
        # milder "ahead of print" placeholder (OpenAlex/DBLP/Zenodo have
        # been seen with dates months to years out). Reject anything more
        # than 90 days beyond now rather than trust it blindly - that's
        # generous enough for genuine forthcoming-issue dates while
        # excluding clearly bad metadata that would otherwise dominate
        # "most recent" sorting.
        if dt > datetime.now(dt_timezone.utc) + timedelta(days=90):
            return None
        return dt
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

            # Semantic Scholar papers
            cur.execute("SELECT raw_data FROM bronze.semantic_scholar_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="semantic_scholar",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # OpenAlex works
            cur.execute("SELECT raw_data FROM bronze.openalex_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="openalex",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # Crossref works
            cur.execute("SELECT raw_data FROM bronze.crossref_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="crossref",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # DBLP publications
            cur.execute("SELECT raw_data FROM bronze.dblp_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="dblp",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # Hugging Face papers
            cur.execute("SELECT raw_data FROM bronze.hf_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="hf_papers",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
                        published_at=pub,
                        score=raw.get("score", 0) or 0,
                    ),
                )
                created += was_created
                updated += not was_created

            # Zenodo records
            cur.execute("SELECT raw_data FROM bronze.zenodo_papers")
            for (raw,) in cur.fetchall():
                raw = json.loads(raw) if isinstance(raw, str) else raw
                pub = parse_dt(raw.get("published_at"))
                if not pub:
                    continue
                obj, was_created = ResearchSignal.objects.update_or_create(
                    external_id=raw["external_id"],
                    defaults=dict(
                        source="zenodo",
                        title=raw.get("title", "")[:500],
                        summary=raw.get("summary", ""),
                        url=raw.get("url", "")[:500],
                        authors=raw.get("authors", "")[:500],
                        topic_tags="",
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
