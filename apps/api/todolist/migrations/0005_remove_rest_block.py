from django.db import migrations


def remove_rest_block(apps, schema_editor):
    ScheduleBlock = apps.get_model('todolist', 'ScheduleBlock')
    ScheduleBlock.objects.filter(name='Rest').delete()


def restore_rest_block(apps, schema_editor):
    ScheduleBlock = apps.get_model('todolist', 'ScheduleBlock')
    ScheduleBlock.objects.update_or_create(
        name='Rest',
        defaults=dict(start_time='07:00', end_time='07:20', order=2, color='#8A8875'),
    )


class Migration(migrations.Migration):

    dependencies = [
        ('todolist', '0004_dailylog'),
    ]

    operations = [
        migrations.RunPython(remove_rest_block, restore_rest_block),
    ]
