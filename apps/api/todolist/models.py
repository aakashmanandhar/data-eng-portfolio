from django.db import models


class ScheduleBlock(models.Model):
    """One fixed block in the daily routine (e.g. 'Gym', 'German Language Learning').
    These are the template rows; TaskCompletion holds one row per block per day."""
    name = models.CharField(max_length=120)
    start_time = models.TimeField()
    end_time = models.TimeField()
    order = models.PositiveSmallIntegerField(default=0, unique=True)
    color = models.CharField(max_length=20, default="#2563EB")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class TaskCompletion(models.Model):
    """Whether a given block was completed on a given date."""
    block = models.ForeignKey(ScheduleBlock, on_delete=models.CASCADE, related_name="completions")
    date = models.DateField()
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True, default="")

    class Meta:
        unique_together = ("block", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.block.name} · {self.date} · {'done' if self.completed else 'pending'}"


class DailyLog(models.Model):
    """One row per day: body weight + nutrition totals the owner logs himself.
    Used to compute BMI, estimated TDEE, calorie deficit and fat-loss trend."""
    date = models.DateField(unique=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    calories = models.PositiveIntegerField(null=True, blank=True)
    protein_g = models.PositiveIntegerField(null=True, blank=True)
    carbs_g = models.PositiveIntegerField(null=True, blank=True)
    fat_g = models.PositiveIntegerField(null=True, blank=True)
    sleep_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date} · {self.weight_kg}kg · {self.calories}kcal"
