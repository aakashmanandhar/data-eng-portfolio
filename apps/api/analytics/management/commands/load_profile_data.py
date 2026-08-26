from django.core.management.base import BaseCommand
from analytics.models import Language, AreaOfExpertise, Profile, Reference, Certification


class Command(BaseCommand):
    help = "Loads languages, expertise, profile summary, references, and certification status"

    def handle(self, *args, **options):
        # Languages
        languages = [
            ("English", "full_professional"),
            ("Swedish", "intermediate"),
            ("Nepali", "native"),
        ]
        Language.objects.all().delete()
        for i, (name, prof) in enumerate(languages):
            Language.objects.create(name=name, proficiency=prof, order=i)
        self.stdout.write(f"  {len(languages)} languages loaded")

        # Areas of expertise
        expertise = [
            "Database Modeling", "Database Design", "Data Management and Standardization",
            "ETL Processes", "Data Pipeline Creation", "Database Backup and Recovery",
        ]
        AreaOfExpertise.objects.all().delete()
        for i, name in enumerate(expertise):
            AreaOfExpertise.objects.create(name=name, order=i)
        self.stdout.write(f"  {len(expertise)} expertise areas loaded")

        # Profile summary
        profile = Profile.load()
        profile.summary = (
            "Data engineer with over 5 years of experience designing, implementing, and "
            "optimizing large-scale databases. Proficient in SQL, data pipeline creation, and "
            "Azure/Databricks cloud-based solutions, with a strong focus on data integrity, "
            "security, and performance."
        )
        profile.save()
        self.stdout.write("  Profile summary set")

        # References (private data, name suppressed on public site per German convention)
        references = [
            ("Bishwambhar Lal Shrestha", "Department Chief – Research and Development", "GeoSpatial Systems Pvt. Ltd.", "bishwa@geosp.com"),
            ("Ashish Manandhar", "Chief Analytics Consultant", "Serene Tech Innovations", "aashishmanandhar99@gmail.com"),
        ]
        Reference.objects.all().delete()
        for i, (name, title, company, email) in enumerate(references):
            Reference.objects.create(name=name, title=title, company=company, email=email, order=i)
        self.stdout.write(f"  {len(references)} references loaded (private)")

        # Certification status updates
        cert_updates = {
            "Oracle Certified Professional, Data Modeling/Warehousing and Database Administration": None,  # already completed, leave as-is
        }

        self.stdout.write(self.style.SUCCESS("Profile data loaded."))
