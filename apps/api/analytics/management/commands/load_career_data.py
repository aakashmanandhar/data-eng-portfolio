from datetime import date
from django.core.management.base import BaseCommand
from analytics.models import Experience, ExperienceHighlight, Education, Certification


class Command(BaseCommand):
    help = "One-time loader: populates Experience/Education/Certification from LinkedIn export"

    def handle(self, *args, **options):
        self.load_experience()
        self.load_education()
        self.stdout.write(self.style.SUCCESS("Career data loaded."))

    def load_experience(self):
        entries = [
            {
                "company": "Serene Tech Innovations",
                "role": "Senior Data Engineer",
                "employment_type": "full_time",
                "location": "Hybrid",
                "is_remote": False,
                "start_date": date(2025, 12, 1),
                "end_date": None,
                "order": 0,
                "skills": ["Data Engineering", "Databricks", "Azure Data Factory", "dbt",
                            "Azure Synapse", "PySpark", "Azure DevOps", "CI/CD",
                            "Medallion Architecture", "Snowflake", "RAG"],
                "highlights": [
                    'Oversee pipeline scoping with finance/ops stakeholders in agile sprint planning, tracing a "speed up reporting" request to a nightly Azure Data Factory batch job, not the dashboard layer everyone assumed was broken.',
                    "Eliminate recurring data quality issues (mismatched customer IDs across sources) using dbt tests and SQL schema checks at ingestion, catching bad records before they reach a report instead of patching downstream.",
                    "Migrate cost-heavy batch pipelines from full-table reloads to incremental loads in Microsoft Fabric and Azure Synapse, cutting compute spend proportional to what changed.",
                    'Diagnose "slow dashboard" complaints as Databricks cluster sizing issues, not query problems, right-sizing clusters and optimizing PySpark jobs instead of rewriting queries that were not the bottleneck.',
                    "Author CI/CD workflows in Azure DevOps for dbt models so every change runs through automated tests before deploy, replacing manual \"did this break anything\" checks entirely.",
                    "Design warehouse architecture using dimensional star schemas and medallion (bronze/silver/gold) layering, separating raw ingestion from business logic so a broken transformation never corrupts source data.",
                    "Weigh which tool fits a given architecture instead of defaulting to one platform, e.g. Databricks for PySpark/ML-heavy workloads needing flexible compute versus Snowflake for SQL-first, BI-facing workloads needing predictable cost scaling.",
                    "Bring hands-on experience building RAG-grounded analytics tooling that answers only from real queried data, and forecasting models that report insufficient data instead of fitting a confident trend to too few points.",
                    "Collaborate in cross-functional agile teams, running sprint reviews and backlog grooming for data infrastructure, keeping priorities tied to business outcomes.",
                    "Leverage AI-assisted coding tools to draft boilerplate and flag anomalies earlier, freeing time for root-cause analysis, with engineering judgment owning every decision the tooling suggests.",
                ],
            },
            {
                "company": "Serene Tech Innovations",
                "role": "Data Engineer",
                "employment_type": "part_time",
                "location": "Remote",
                "is_remote": True,
                "start_date": date(2023, 1, 1),
                "end_date": date(2025, 12, 1),
                "order": 1,
                "skills": ["PostgreSQL", "SQL", "Azure SQL Server", "Azure Data Factory", "Azure DevOps"],
                "highlights": [
                    "Transformed raw, inconsistent data into analytics-ready formats using SQL and Azure SQL Server, crafting validation rules and consistency checks at the source rather than letting data quality issues surface downstream in reports.",
                    "Diagnosed slow-running SQL queries by analyzing execution plans and indexing strategy, then optimized them to cut query runtime directly speeding up reporting and dashboard load times for downstream users.",
                    "Orchestrated data pipelines connecting source systems to analytics platforms using Azure Data Factory, ensuring reliable, consistent data flow rather than one-off, manual data transfers.",
                    "Collaborated directly with data scientists, analysts, and business stakeholders to translate ambiguous data requests into clear technical requirements, ensuring delivered solutions solved the underlying business problem rather than just the literal ask.",
                    "Authored and maintained documentation for database schemas, ETL processes, and pipeline logic in Azure DevOps, reducing onboarding time for new team members and cutting down repeated \"how does this work\" questions.",
                ],
            },
            {
                "company": "GeoSpatial Systems Pvt. Ltd.",
                "role": "Programmer - Data Team",
                "employment_type": "full_time",
                "location": "Jawalakhel, Lalitpur, Nepal",
                "is_remote": False,
                "start_date": date(2018, 5, 1),
                "end_date": date(2022, 7, 1),
                "order": 2,
                "skills": ["Data Profiling", "IT architectures", "PostgreSQL", "PostGIS", "ArcGIS", "GIS"],
                "highlights": [
                    "Architected and maintained the company's core data platform, designing a PostgreSQL-based data warehouse (PostGIS-enabled) to centralize transformed GIS data for consistent, scalable analytical use across teams.",
                    "Collaborated closely with the GIS team to translate spatial analysis requirements into technical specifications, building Web GIS applications and interactive GIS dashboards using ArcGIS that turned raw spatial data into decision-ready visual insights.",
                    "Crafted ETL workflows to transform raw geospatial data (shapefiles, raster data, coordinate systems) into standardized, query-optimized formats, resolving inconsistencies in spatial reference systems before they could break downstream analysis.",
                    "Diagnosed performance bottlenecks in spatial queries against large GIS datasets, optimizing PostgreSQL/PostGIS indexing and query structure to keep dashboards and map-rendering responsive at scale.",
                    "Orchestrated data pipelines feeding the GIS data warehouse from multiple source systems, ensuring spatial and attribute data stayed synchronized and analysis-ready without manual intervention.",
                    "Authored documentation covering spatial data schemas, ETL logic, and ArcGIS integration points, giving the GIS team a clear reference for how data moved from raw source to dashboard.",
                ],
            },
            {
                "company": "I.T. Security College of Computer Studies",
                "role": "Lead Python and Django Framework Developer",
                "employment_type": "full_time",
                "location": "Nepal",
                "is_remote": False,
                "start_date": date(2015, 11, 1),
                "end_date": date(2018, 2, 1),
                "order": 3,
                "skills": ["Python", "Django", "Communication", "Cross-functional Team Leadership"],
                "highlights": [],
            },
            {
                "company": "Freelancer",
                "role": "Freelance Software Engineer",
                "employment_type": "freelance",
                "location": "",
                "is_remote": True,
                "start_date": date(2014, 2, 1),
                "end_date": date(2015, 7, 1),
                "order": 4,
                "skills": ["Database Design", "Requirements Analysis", "Software Development",
                            "Bug Fixes", "Technical Documentation"],
                "highlights": [
                    "Database Design and Implementation",
                    "Software Requirement Specification",
                    "Software Development",
                    "Software Design and Implementation",
                    "Requirement Analysis",
                    "Coding and Implementation",
                    "Bug Fixes",
                    "Technical Documentation",
                    "User Manual",
                ],
            },
            {
                "company": "Multi Displinary and Commerical Enterprise",
                "role": "IT Support Technician",
                "employment_type": "full_time",
                "location": "Kathmandu, Bagmati, Nepal",
                "is_remote": False,
                "start_date": date(2009, 2, 1),
                "end_date": date(2011, 9, 1),
                "order": 5,
                "skills": ["Customer Service", "Teamwork", "Networking", "Troubleshooting"],
                "highlights": [
                    "Software Installation",
                    "Software Solutions",
                    "Remote IT Support via chat, email and telephone",
                    "Troubleshooting",
                    "Printer Setup",
                    "Networking",
                ],
            },
        ]

        for entry in entries:
            highlights = entry.pop("highlights")
            exp, created = Experience.objects.update_or_create(
                company=entry["company"], role=entry["role"],
                defaults=entry,
            )
            exp.highlights.all().delete()
            for i, text in enumerate(highlights):
                ExperienceHighlight.objects.create(experience=exp, text=text, order=i)
            self.stdout.write(f"  {'Created' if created else 'Updated'}: {exp.role} @ {exp.company}")

    def load_education(self):
        entries = [
            {
                "institution": "Uppsala University",
                "degree": "Master's Programme in Information Systems, Artificial Intelligence and Big Data",
                "field_of_study": "Information Systems",
                "start_date": date(2022, 8, 1),
                "end_date": date(2024, 6, 1),
                "thesis_or_note": "Master's thesis in Agile Data Engineering",
                "skills": ["Data Warehousing", "Azure Data Factory"],
                "order": 0,
            },
            {
                "institution": "London Metropolitan University",
                "degree": "Bachelor of Science Honours in Computing, Computer Software Engineering",
                "field_of_study": "Computer Software Engineering",
                "start_date": date(2010, 1, 1),
                "end_date": date(2013, 1, 1),
                "thesis_or_note": "",
                "skills": ["PostgreSQL", "English"],
                "order": 1,
            },
            {
                "institution": "Informatics Education Ltd.",
                "degree": "International Diploma in Information Communication and Technology, Information Technology",
                "field_of_study": "Information Technology",
                "start_date": date(2010, 1, 1),
                "end_date": date(2011, 1, 1),
                "thesis_or_note": "",
                "skills": ["PostgreSQL", "Performance Tuning"],
                "order": 2,
            },
            {
                "institution": "Oracle University",
                "degree": "Oracle Certified Professional, Data Modeling/Warehousing and Database Administration",
                "field_of_study": "",
                "start_date": date(2015, 1, 1),
                "end_date": date(2015, 1, 1),
                "thesis_or_note": "",
                "skills": ["PostgreSQL", "Query Optimization"],
                "order": 3,
            },
            {
                "institution": "Himalayan Whitehouse International College",
                "degree": "High School Diploma",
                "field_of_study": "",
                "start_date": date(2008, 1, 1),
                "end_date": date(2010, 1, 1),
                "thesis_or_note": "",
                "skills": ["Business Planning", "Accounting"],
                "order": 4,
            },
        ]

        for entry in entries:
            edu, created = Education.objects.update_or_create(
                institution=entry["institution"], degree=entry["degree"],
                defaults=entry,
            )
            self.stdout.write(f"  {'Created' if created else 'Updated'}: {edu.degree} - {edu.institution}")
