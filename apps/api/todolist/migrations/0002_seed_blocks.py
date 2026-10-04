from django.db import migrations

BLOCKS = [
    ("Stretching, Mobility & Light Exercise", "05:00", "07:00", 1, "#3B6D11"),
    ("Rest", "07:00", "07:20", 2, "#8A8875"),
    ("Physio & Stretching", "07:30", "09:00", 3, "#2E7D8C"),
    ("Gym — Resistance & Weight Training, Cardio", "09:45", "11:00", 4, "#C9892E"),
    ("Data Engineering Comprehensive", "12:00", "15:00", 5, "#3B6D11"),
    ("Artificial Intelligence Mastery", "15:15", "18:15", 6, "#6A4C93"),
    ("MS Fabric Mastery", "18:15", "20:15", 7, "#1F6FEB"),
    ("German Language Learning", "20:15", "22:15", 8, "#D14545"),
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
    ScheduleBlock.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("todolist", "0001_initial")]
    operations = [migrations.RunPython(seed_blocks, unseed_blocks)]
