from django.core.management.base import BaseCommand
from django.db import connection
from analytics.models import Experience, Education, Certification, Language, AreaOfExpertise, KeyAchievement, Profile
from rag.services import client


def embed_text(text):
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config={"output_dimensionality": 1536}
    )
    return response.embeddings[0].values


class Command(BaseCommand):
    help = "Chunks and embeds career/CV data for the RAG assistant"

    def handle(self, *args, **options):
        with connection.cursor() as cur:
            cur.execute("DELETE FROM rag_embedding WHERE source_type = 'career'")
        self.stdout.write("Cleared existing career embeddings.")

        chunks = []

        profile = Profile.load()
        if profile.summary:
            chunks.append(profile.summary)

        visible_exp = Experience.objects.filter(is_visible=True).order_by('-start_date')
        if visible_exp.exists():
            current = visible_exp.filter(end_date__isnull=True).first()
            companies = ", ".join(sorted(set(e.company for e in visible_exp)))
            overview = (
                f"Aakash Manandhar is a Data Engineer with professional data engineering experience since 2018. "
                f"He has worked at: {companies}. "
            )
            if current:
                overview += f"He is currently working as {current.role} at {current.company}."
            chunks.append(overview)

        for exp in visible_exp:
            start = exp.start_date.strftime("%B %Y")
            end = exp.end_date.strftime("%B %Y") if exp.end_date else "present"
            highlights = " ".join(h.text for h in exp.highlights.all())
            skills_str = ", ".join(exp.skills) if exp.skills else ""
            chunk = (
                f"Aakash Manandhar worked as {exp.role} at {exp.company} from {start} to {end}"
                f"{' (' + exp.get_employment_type_display() + ')' if exp.employment_type else ''}. "
                f"{highlights} "
            )
            if skills_str:
                chunk += f"Technologies and skills used in this role: {skills_str}."
            chunks.append(chunk)

        for edu in Education.objects.all():
            start = edu.start_date.strftime("%B %Y")
            end = edu.end_date.strftime("%B %Y") if edu.end_date else "present"
            chunk = f"Aakash Manandhar studied {edu.degree} at {edu.institution}"
            if edu.location:
                chunk += f" in {edu.location}"
            chunk += f", from {start} to {end}."
            if edu.thesis_or_note:
                chunk += f" {edu.thesis_or_note}."
            chunks.append(chunk)

        for cert in Certification.objects.all():
            if cert.status == 'in_progress':
                chunk = (
                    f"Aakash Manandhar is currently pursuing the {cert.name} certification from {cert.issuer}. "
                    f"This certification is in progress"
                    f"{' - ' + cert.target_date_note if cert.target_date_note else ''}, not yet completed."
                )
            else:
                chunk = f"Aakash Manandhar holds the {cert.name} certification from {cert.issuer}."
            chunks.append(chunk)

        languages = Language.objects.all()
        if languages.exists():
            lang_parts = [f"{l.name} ({l.get_proficiency_display()})" for l in languages]
            chunks.append("Aakash Manandhar speaks the following languages: " + ", ".join(lang_parts) + ".")

        expertise = list(AreaOfExpertise.objects.all())
        if expertise:
            names = ", ".join(e.name for e in expertise)
            chunks.append(
                f"Aakash Manandhar's core areas of expertise as a data engineer are: {names}. "
                f"These represent his strongest, most current technical focus areas."
            )

        for ach in KeyAchievement.objects.all():
            chunks.append(f"Key achievement - {ach.title}: {ach.description}")

        chunks.append(
            "Aakash Manandhar's full resume/CV is available as a downloadable PDF on the /career page of this site, "
            "formatted to German CV standards. His professional experience listed there focuses specifically on his "
            "data engineering career (since 2018) - earlier roles such as IT support and general software development "
            "are part of his broader work history but are not the focus of his current data engineering career."
        )
        chunks.append(
            "Aakash Manandhar built this entire portfolio site himself, including its live data pipelines, "
            "the interactive career/CV page with dynamic content managed through Django admin, and this RAG-based "
            "chat assistant you are currently talking to. The chat assistant itself is a real example of his "
            "data engineering and AI-assisted platform development skills - it routes questions to either live "
            "SQL queries against the site's own data warehouse, or vector search (RAG) over embedded content "
            "like this one, depending on what's being asked."
        )
        chunks.append(
            "If asked what tools Aakash Manandhar is most experienced with, his core stack includes Azure, "
            "Databricks, dbt, PySpark, Azure Data Factory, Azure Synapse, Snowflake, PostgreSQL/PostGIS, SQL, "
            "Python, and Airflow. He also has hands-on experience building RAG-grounded analytics tools and "
            "self-healing AI-assisted data pipelines, as demonstrated by this very site."
        )

        self.stdout.write(f"Built {len(chunks)} career chunks. Embedding now...")

        from rag.models import Embedding
        for i, chunk_text in enumerate(chunks):
            vector = embed_text(chunk_text)
            Embedding.objects.create(
                source_type='career',
                source_id=i,
                chunk_text=chunk_text,
                embedding=vector,
            )
            self.stdout.write(f"  Embedded chunk {i+1}/{len(chunks)}")

        self.stdout.write(self.style.SUCCESS(f"Done. {len(chunks)} career chunks embedded."))
