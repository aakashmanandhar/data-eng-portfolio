from django.core.management.base import BaseCommand
from analytics.models import Experience, ExperienceHighlight


class Command(BaseCommand):
    help = "Trims experience highlights to German-CV-style fact-dense bullets with strong action verbs"

    def handle(self, *args, **options):
        trimmed = {
            ("Serene Tech Innovations", "Senior Data Engineer"): [
                "Facilitated pipeline scoping with finance/ops stakeholders in agile sprint planning",
                "Implemented data quality checks at ingestion using dbt tests and SQL schema validation",
                "Executed migration of batch pipelines to incremental loads (Microsoft Fabric, Azure Synapse)",
                "Optimized Databricks cluster sizing and PySpark job performance",
                "Authored CI/CD workflows in Azure DevOps for automated dbt model testing",
                "Designed warehouse architecture: dimensional star schemas, medallion (bronze/silver/gold) layering",
                "Directed platform selection: Databricks (PySpark/ML) vs. Snowflake (SQL/BI) by workload fit",
                "Crafted RAG-grounded analytics tooling and forecasting models with confidence thresholds",
                "Collaborated cross-functionally in agile ceremonies: sprint reviews, backlog grooming",
                "Leveraged AI-assisted development tooling for boilerplate generation and anomaly detection",
            ],
            ("Serene Tech Innovations", "Data Engineer"): [
                "Transformed and validated data using SQL and Azure SQL Server",
                "Optimized queries via execution plan analysis and indexing strategy",
                "Orchestrated pipelines connecting source systems to analytics platforms (Azure Data Factory)",
                "Facilitated requirements translation between stakeholders and technical implementation",
                "Authored technical documentation of schemas, ETL processes, and pipeline logic (Azure DevOps)",
            ],
            ("GeoSpatial Systems Pvt. Ltd.", "Programmer - Data Team"): [
                "Architected PostgreSQL/PostGIS data warehouse for centralized GIS data",
                "Directed development of Web GIS applications and dashboards (ArcGIS)",
                "Crafted ETL workflows for geospatial data (shapefiles, raster data, coordinate systems)",
                "Optimized spatial query performance via PostgreSQL/PostGIS indexing",
                "Orchestrated multi-source pipelines feeding the GIS data warehouse",
                "Authored technical documentation: spatial schemas, ETL logic, ArcGIS integration",
            ],
            ("Freelancer", "Freelance Software Engineer"): [
                "Crafted database design and implementation",
                "Carried out software requirement specification and analysis",
                "Executed full software development lifecycle: design, coding, testing, documentation",
            ],
            ("Multi Displinary and Commerical Enterprise", "IT Support Technician"): [
                "Carried out software installation and troubleshooting",
                "Facilitated remote IT support via chat, email, and telephone",
                "Executed network and printer setup",
            ],
        }

        for (company, role), highlights in trimmed.items():
            try:
                exp = Experience.objects.get(company=company, role=role)
            except Experience.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Skipped (not found): {role} @ {company}"))
                continue
            exp.highlights.all().delete()
            for i, text in enumerate(highlights):
                ExperienceHighlight.objects.create(experience=exp, text=text, order=i)
            self.stdout.write(f"  Trimmed: {role} @ {company} ({len(highlights)} bullets)")

        self.stdout.write(self.style.SUCCESS("Highlights trimmed to CV format with strong action verbs."))
