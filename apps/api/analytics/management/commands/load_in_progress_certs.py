from django.core.management.base import BaseCommand
from analytics.models import Certification


class Command(BaseCommand):
    help = "Loads in-progress certifications"

    def handle(self, *args, **options):
        certs = [
            {
                "name": "Microsoft Certified: Fabric Data Engineer Associate",
                "issuer": "Microsoft",
                "status": "in_progress",
                "target_date_note": "Exam in February 2026",
                "order": 0,
            },
            {
                "name": "Databricks Certified Data Engineer Associate",
                "issuer": "Databricks",
                "status": "in_progress",
                "target_date_note": "Exam in March 2026",
                "order": 1,
            },
            {
                "name": "Databricks Certified Data Engineer Professional",
                "issuer": "Databricks",
                "status": "in_progress",
                "target_date_note": "Exam in April 2026",
                "order": 2,
            },
        ]

        for c in certs:
            obj, created = Certification.objects.update_or_create(
                name=c["name"], issuer=c["issuer"],
                defaults=c,
            )
            self.stdout.write(f"  {'Created' if created else 'Updated'}: {obj.name}")

        self.stdout.write(self.style.SUCCESS("In-progress certifications loaded."))
