from django.db import migrations

BLOCKS = [
    ("1st Meal — 40-50g protein", "07:00", "07:15", 9, "#C2410C"),
    ("2nd Meal — 40-50g protein", "11:30", "11:45", 10, "#C2410C"),
    ("3rd Meal — 40-50g protein", "20:30", "20:45", 11, "#C2410C"),
    ("18h Intermittent Fasting", "00:00", "00:00", 12, "#0D9488"),
]


def seed_blocks(apps, schema_editor):
    ScheduleBlock = apps.get_model("todolist", "ScheduleBlock")
    for name, start, end, order, color in BLOCKS:
        ScheduleBlock.objects.update_or_create(
            order=order,
            defaults={"name": name, "start_time": start, "end_time": end, "color": color},
        )


def unseed_blocks(apps, schema_editor):
    ScheduleBlock = apps.get_model("todolist", "ScheduleBlock")
    ScheduleBlock.objects.filter(order__in=[9, 10, 11, 12]).delete()


class Migration(migrations.Migration):
    dependencies = [("todolist", "0002_seed_blocks")]
    operations = [migrations.RunPython(seed_blocks, unseed_blocks)]
