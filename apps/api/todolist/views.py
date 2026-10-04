import os
from datetime import date, timedelta

from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ScheduleBlock, TaskCompletion, DailyLog

# Fixed personal stats used for BMI/TDEE estimates. Update these by hand if
# they change (height doesn't, but age and activity level might).
HEIGHT_CM = 175
AGE_YEARS = 34
ACTIVITY_FACTOR = 1.55  # "moderately active": structured exercise most days of the week

# The program runs Oct 7, 2026 through end of July 2027. The consistency
# trend chart spans this whole window (growing week by week) rather than a
# fixed rolling period, so it doubles as a full-program history.
PROGRAM_START = date(2026, 10, 7)


class HasTodoToken(BasePermission):
    """Gate: every request must carry the same secret the owner set in
    TODO_ACCESS_TOKEN (kept only in the gitignored .env, never committed)."""

    def has_permission(self, request, view):
        expected = os.environ.get("TODO_ACCESS_TOKEN")
        if not expected:
            return False
        provided = request.headers.get("X-Todo-Token", "")
        return provided == expected


class TodoVerifyView(APIView):
    """No permission class here on purpose - this IS the password check.
    Everything else requires the same token via HasTodoToken."""
    permission_classes = []

    def post(self, request):
        expected = os.environ.get("TODO_ACCESS_TOKEN")
        provided = request.data.get("token", "")
        if expected and provided == expected:
            return Response({"ok": True})
        return Response({"ok": False, "error": "Incorrect password"}, status=401)


class TodayView(APIView):
    permission_classes = [HasTodoToken]

    def get(self, request):
        today = timezone.localdate()
        if today.weekday() == 5:  # Saturday - full rest day, nothing tracked
            return Response({"date": str(today), "is_rest_day": True, "blocks": []})
        rows = []
        for block in ScheduleBlock.objects.all():
            completion, _ = TaskCompletion.objects.get_or_create(block=block, date=today)
            rows.append({
                "id": completion.id,
                "name": block.name,
                "start_time": block.start_time.strftime("%H:%M"),
                "end_time": block.end_time.strftime("%H:%M"),
                "color": block.color,
                "completed": completion.completed,
            })
        return Response({"date": str(today), "is_rest_day": False, "blocks": rows})


class ToggleView(APIView):
    permission_classes = [HasTodoToken]

    def post(self, request):
        completion_id = request.data.get("id")
        try:
            completion = TaskCompletion.objects.get(id=completion_id)
        except TaskCompletion.DoesNotExist:
            return Response({"error": "not found"}, status=404)
        completion.completed = not completion.completed
        completion.completed_at = timezone.now() if completion.completed else None
        completion.save()
        return Response({"id": completion.id, "completed": completion.completed})


class SummaryView(APIView):
    """Weekly + all-time analytics: this week's grid, a 12-week consistency
    trend, per-block completion rates, and current/longest streaks.
    Saturdays are a full rest day - no blocks are expected, so they never
    count against consistency or break a streak."""
    permission_classes = [HasTodoToken]

    @staticmethod
    def is_rest_day(d):
        return d.weekday() == 5  # Saturday

    def get(self, request):
        today = timezone.localdate()
        total_blocks = ScheduleBlock.objects.count()

        week_start = today - timedelta(days=today.weekday())
        week_rows = []
        for i in range(7):
            d = week_start + timedelta(days=i)
            if self.is_rest_day(d):
                week_rows.append({"date": str(d), "day": d.strftime("%a"), "completed": 0, "total": 0, "rate": None, "is_rest_day": True})
                continue
            if d > today:
                week_rows.append({"date": str(d), "day": d.strftime("%a"), "completed": 0, "total": total_blocks, "rate": None, "is_rest_day": False})
                continue
            done = TaskCompletion.objects.filter(date=d, completed=True).count()
            week_rows.append({
                "date": str(d),
                "day": d.strftime("%a"),
                "completed": done,
                "total": total_blocks,
                "rate": round(done / total_blocks * 100, 1) if total_blocks else 0,
                "is_rest_day": False,
            })

        weeks_elapsed = max(0, (today - PROGRAM_START).days // 7 + 1) if today >= PROGRAM_START else 0
        trend = []
        for w in range(weeks_elapsed - 1, -1, -1):
            w_start = week_start - timedelta(weeks=w)
            w_end = min(w_start + timedelta(days=6), today)
            if w_end < w_start:
                trend.append({"week": w_start.strftime("%b %d"), "rate": 0})
                continue
            done = TaskCompletion.objects.filter(date__gte=w_start, date__lte=w_end, completed=True).count()
            possible = 0
            d = w_start
            while d <= w_end:
                if not self.is_rest_day(d):
                    possible += total_blocks
                d += timedelta(days=1)
            trend.append({
                "week": w_start.strftime("%b %d"),
                "rate": round(done / possible * 100, 1) if possible else 0,
            })

        per_block = []
        for block in ScheduleBlock.objects.all():
            qs = TaskCompletion.objects.filter(block=block)
            total = qs.count()
            done = qs.filter(completed=True).count()
            per_block.append({
                "name": block.name,
                "color": block.color,
                "rate": round(done / total * 100, 1) if total else 0,
                "completed": done,
                "total": total,
            })

        # Current streak: consecutive fully-completed days. Today doesn't count
        # against the streak while it's still in progress - it only joins once
        # every block on it is checked off. Rest days are skipped entirely as
        # the cursor walks backward - they neither break the streak nor add to
        # it on their own, so a lone rest day with nothing completed around it
        # never counts as "1 day".
        current_streak = 0
        today_done_count = TaskCompletion.objects.filter(date=today, completed=True).count()
        today_satisfied = self.is_rest_day(today) or (total_blocks and today_done_count >= total_blocks)
        cursor = today if today_satisfied else today - timedelta(days=1)
        while total_blocks:
            if self.is_rest_day(cursor):
                cursor -= timedelta(days=1)
                continue
            done = TaskCompletion.objects.filter(date=cursor, completed=True).count()
            if done < total_blocks:
                break
            current_streak += 1
            cursor -= timedelta(days=1)

        # Longest streak ever: walk every calendar day from the first logged
        # day to today. Rest days are skipped entirely (they neither extend
        # nor break a run - only real completed days count toward length).
        tracked_dates = TaskCompletion.objects.values_list("date", flat=True).distinct()
        longest_streak = 0
        if tracked_dates:
            running = 0
            d = min(tracked_dates)
            while d <= today:
                if self.is_rest_day(d):
                    d += timedelta(days=1)
                    continue
                done = TaskCompletion.objects.filter(date=d, completed=True).count()
                running = running + 1 if (total_blocks and done >= total_blocks) else 0
                longest_streak = max(longest_streak, running)
                d += timedelta(days=1)

        overall_qs = TaskCompletion.objects.all()
        overall_total = overall_qs.count()
        overall_done = overall_qs.filter(completed=True).count()

        return Response({
            "week": week_rows,
            "trend": trend,
            "per_block": per_block,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "overall_rate": round(overall_done / overall_total * 100, 1) if overall_total else 0,
        })


class NutritionSaveView(APIView):
    """Upserts today's (or a given date's) weight + nutrition totals."""
    permission_classes = [HasTodoToken]

    def post(self, request):
        log_date = request.data.get("date") or timezone.localdate()
        defaults = {}
        for field in ("weight_kg", "calories", "protein_g", "carbs_g", "fat_g", "sleep_score"):
            value = request.data.get(field)
            if value not in (None, ""):
                defaults[field] = value
        log, _ = DailyLog.objects.update_or_create(date=log_date, defaults=defaults)
        return Response({
            "date": str(log.date),
            "weight_kg": log.weight_kg,
            "calories": log.calories,
            "protein_g": log.protein_g,
            "carbs_g": log.carbs_g,
            "fat_g": log.fat_g,
            "sleep_score": log.sleep_score,
        })


class HealthSummaryView(APIView):
    """BMI from the latest logged weight, an estimated TDEE (Mifflin-St Jeor x
    activity factor), a 14-day weight/calorie trend for the charts, and a
    weekly fat-loss estimate from the last 7 logged days' calorie deficit."""
    permission_classes = [HasTodoToken]

    def get(self, request):
        today = timezone.localdate()

        latest_weight_log = DailyLog.objects.filter(weight_kg__isnull=False).order_by("-date").first()
        latest_weight = float(latest_weight_log.weight_kg) if latest_weight_log else None

        bmi = None
        bmi_category = None
        tdee = None
        if latest_weight:
            height_m = HEIGHT_CM / 100
            bmi = round(latest_weight / (height_m ** 2), 1)
            if bmi < 18.5:
                bmi_category = "Underweight"
            elif bmi < 25:
                bmi_category = "Normal"
            elif bmi < 30:
                bmi_category = "Overweight"
            else:
                bmi_category = "Obese"
            bmr = 10 * latest_weight + 6.25 * HEIGHT_CM - 5 * AGE_YEARS + 5
            tdee = round(bmr * ACTIVITY_FACTOR)

        window_start = today - timedelta(days=13)
        recent = DailyLog.objects.filter(date__gte=window_start, date__lte=today).order_by("date")
        weight_trend = []
        calorie_trend = []
        sleep_trend = []
        deficits = []
        for log in recent:
            if log.weight_kg is not None:
                weight_trend.append({"date": log.date.strftime("%b %d"), "weight": float(log.weight_kg)})
            if log.calories is not None and tdee:
                deficit = tdee - log.calories
                calorie_trend.append({"date": log.date.strftime("%b %d"), "calories": log.calories, "tdee": tdee, "deficit": deficit})
                deficits.append(deficit)
            if log.sleep_score is not None:
                sleep_trend.append({"date": log.date.strftime("%b %d"), "sleep_score": float(log.sleep_score)})

        weekly_deficit = sum(deficits[-7:]) if deficits else 0
        estimated_weekly_fat_loss_kg = round(weekly_deficit / 7700, 2) if deficits else None

        today_log = DailyLog.objects.filter(date=today).first()

        return Response({
            "height_cm": HEIGHT_CM,
            "age": AGE_YEARS,
            "latest_weight": latest_weight,
            "bmi": bmi,
            "bmi_category": bmi_category,
            "estimated_tdee": tdee,
            "weight_trend": weight_trend,
            "calorie_trend": calorie_trend,
            "sleep_trend": sleep_trend,
            "estimated_weekly_fat_loss_kg": estimated_weekly_fat_loss_kg,
            "today": {
                "weight_kg": float(today_log.weight_kg) if today_log and today_log.weight_kg is not None else None,
                "calories": today_log.calories if today_log else None,
                "protein_g": today_log.protein_g if today_log else None,
                "carbs_g": today_log.carbs_g if today_log else None,
                "fat_g": today_log.fat_g if today_log else None,
                "sleep_score": float(today_log.sleep_score) if today_log and today_log.sleep_score is not None else None,
            },
        })


class WeeklyReviewView(APIView):
    """Per-week rollup: consistency, nutrition averages, sleep average,
    weight change and an estimated fat-loss figure, for the current week
    plus a short history for trend charts. Most useful checked on
    Saturdays (rest day review), but always reflects the week to date."""
    permission_classes = [HasTodoToken]

    def _week_stats(self, w_start, w_end, total_blocks):
        done = TaskCompletion.objects.filter(date__gte=w_start, date__lte=w_end, completed=True).count()
        possible = 0
        d = w_start
        while d <= w_end:
            if d.weekday() != 5:
                possible += total_blocks
            d += timedelta(days=1)
        consistency_rate = round(done / possible * 100, 1) if possible else None

        logs = list(DailyLog.objects.filter(date__gte=w_start, date__lte=w_end).order_by("date"))
        cal_logs = [l for l in logs if l.calories is not None]
        protein_logs = [l for l in logs if l.protein_g is not None]
        carb_logs = [l for l in logs if l.carbs_g is not None]
        fat_logs = [l for l in logs if l.fat_g is not None]
        sleep_logs = [l for l in logs if l.sleep_score is not None]
        weight_logs = [l for l in logs if l.weight_kg is not None]

        avg_calories = round(sum(l.calories for l in cal_logs) / len(cal_logs)) if cal_logs else None
        avg_protein = round(sum(l.protein_g for l in protein_logs) / len(protein_logs)) if protein_logs else None
        avg_carbs = round(sum(l.carbs_g for l in carb_logs) / len(carb_logs)) if carb_logs else None
        avg_fat = round(sum(l.fat_g for l in fat_logs) / len(fat_logs)) if fat_logs else None
        avg_sleep = round(float(sum(l.sleep_score for l in sleep_logs) / len(sleep_logs)), 1) if sleep_logs else None

        weight_change = None
        if weight_logs:
            weight_change = round(float(weight_logs[-1].weight_kg) - float(weight_logs[0].weight_kg), 2)

        tdee = None
        if weight_logs:
            bmr_weight = float(weight_logs[-1].weight_kg)
            bmr = 10 * bmr_weight + 6.25 * HEIGHT_CM - 5 * AGE_YEARS + 5
            tdee = bmr * ACTIVITY_FACTOR

        deficits = [tdee - l.calories for l in cal_logs] if tdee else []
        estimated_fat_loss_kg = round(sum(deficits) / 7700, 2) if deficits else None

        return {
            "week_start": str(w_start),
            "week_end": str(w_end),
            "consistency_rate": consistency_rate,
            "days_logged": len(logs),
            "avg_calories": avg_calories,
            "avg_protein_g": avg_protein,
            "avg_carbs_g": avg_carbs,
            "avg_fat_g": avg_fat,
            "avg_sleep_score": avg_sleep,
            "weight_change_kg": weight_change,
            "estimated_fat_loss_kg": estimated_fat_loss_kg,
        }

    def get(self, request):
        today = timezone.localdate()
        total_blocks = ScheduleBlock.objects.count()
        week_start = today - timedelta(days=today.weekday())

        current = self._week_stats(week_start, min(week_start + timedelta(days=6), today), total_blocks)

        history = []
        for w in range(7, 0, -1):
            w_start = week_start - timedelta(weeks=w)
            w_end = w_start + timedelta(days=6)
            history.append(self._week_stats(w_start, w_end, total_blocks))

        return Response({"current_week": current, "history": history})


class ProjectionView(APIView):
    """Simple trend-based forecast: using the logged calorie deficits from
    the last 14 days, projects weight and BMI forward 12 weeks assuming the
    current pace continues. This is a linear extrapolation of your own
    logged data - not a trained model - and only returns a projection once
    there is enough real data logged to make it meaningful."""
    permission_classes = [HasTodoToken]
    HORIZON_WEEKS = 12

    def get(self, request):
        today = timezone.localdate()
        window_start = today - timedelta(days=13)
        recent = DailyLog.objects.filter(date__gte=window_start, date__lte=today).order_by("date")

        latest_weight_log = DailyLog.objects.filter(weight_kg__isnull=False).order_by("-date").first()
        starting_weight = float(latest_weight_log.weight_kg) if latest_weight_log else None

        tdee = None
        if starting_weight:
            bmr = 10 * starting_weight + 6.25 * HEIGHT_CM - 5 * AGE_YEARS + 5
            tdee = bmr * ACTIVITY_FACTOR

        cal_logs = [l for l in recent if l.calories is not None]
        days_logged = len(cal_logs)
        has_enough_data = days_logged >= 3 and starting_weight is not None
        height_m = HEIGHT_CM / 100

        if not has_enough_data:
            return Response({
                "has_enough_data": False,
                "days_logged": days_logged,
                "avg_daily_deficit": None,
                "weekly_rate_kg": None,
                "starting_weight": starting_weight,
                "starting_bmi": round(starting_weight / (height_m ** 2), 1) if starting_weight else None,
                "projection": [],
                "projected_bmi_category": None,
            })

        avg_daily_deficit = sum(tdee - l.calories for l in cal_logs) / days_logged
        weekly_rate_kg = round((avg_daily_deficit * 7) / 7700, 3)

        projection = []
        for week in range(self.HORIZON_WEEKS + 1):
            projected_weight = round(starting_weight - weekly_rate_kg * week, 1)
            projected_bmi = round(projected_weight / (height_m ** 2), 1)
            projection.append({
                "week": week,
                "date": str(today + timedelta(weeks=week)),
                "weight": projected_weight,
                "bmi": projected_bmi,
            })

        final_bmi = projection[-1]["bmi"]
        if final_bmi < 18.5:
            projected_bmi_category = "Underweight"
        elif final_bmi < 25:
            projected_bmi_category = "Normal"
        elif final_bmi < 30:
            projected_bmi_category = "Overweight"
        else:
            projected_bmi_category = "Obese"

        return Response({
            "has_enough_data": True,
            "days_logged": days_logged,
            "avg_daily_deficit": round(avg_daily_deficit),
            "weekly_rate_kg": weekly_rate_kg,
            "starting_weight": starting_weight,
            "starting_bmi": round(starting_weight / (height_m ** 2), 1),
            "projection": projection,
            "projected_bmi_category": projected_bmi_category,
        })
