from django.core.management.base import BaseCommand
from analytics.models import Education


class Command(BaseCommand):
    help = "Sets location field on existing Education entries"

    def handle(self, *args, **options):
        locations = {
            "Uppsala University": "Uppsala, Sweden",
            "London Metropolitan University": "London, United Kingdom",
            "Informatics Education Ltd.": "Singapore",
            "Oracle University": "Online",
            "Himalayan Whitehouse International College": "Kathmandu, Nepal",
        }

        for institution, location in locations.items():
            updated = Education.objects.filter(institution=institution).update(location=location)
            self.stdout.write(f"  {institution}: {updated} row(s) updated")

        self.stdout.write(self.style.SUCCESS("Education locations set."))
