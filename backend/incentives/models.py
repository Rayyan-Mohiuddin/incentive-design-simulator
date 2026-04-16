from django.db import models
from django.core.exceptions import ValidationError

# Create your models here.
class Participant(models.Model):
    name = models.CharField(max_length=50)
    role = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Metric(models.Model):
    METRIC_CHOICES = [
        ('PER', 'Percentage'),
        ('RAT', 'Rating'),
        ('AMT', 'Amount')
    ]

    AGGR_CHOICES = [
        ('AVG', 'Average'),
        ('SUM', 'Total'),
        ('MIN', 'Minimum'),
        ('MAX', 'Maximum')
    ]

    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    metric_type = models.CharField(max_length=3, choices=METRIC_CHOICES)
    min_value = models.FloatField(null=True)
    max_value = models.FloatField(null=True)
    aggr_method = models.CharField(max_length=3, choices=AGGR_CHOICES, default=AGGR_CHOICES[0][0])
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Context(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class MetricValue(models.Model):
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE)
    metric = models.ForeignKey(Metric, null=True, on_delete=models.SET_NULL)
    value = models.FloatField(null=False)
    context = models.ForeignKey(Context, on_delete=models.CASCADE)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.metric:
            if self.metric.min_value is not None and self.value < self.metric.min_value:
                raise ValidationError(f"Enter a value greater than {self.metric.min_value}")
            elif self.metric.max_value is not None and self.value > self.metric.max_value:
                raise ValidationError(f"Enter a value smaller than {self.metric.max_value}")

    def __str__(self):
        return f"Participant: {self.participant}, Metric: {self.metric} - {self.context}"
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class IncentivePlan(models.Model):
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    fixed_base_amount = models.FloatField(null=False)
    variable_base_amount = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    

class Rule(models.Model):
    name = models.CharField(max_length=50)
    plan = models.ForeignKey(IncentivePlan, on_delete=models.CASCADE)
    metric = models.ForeignKey(Metric, null=True, on_delete=models.SET_NULL)
    weight = models.FloatField(null=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name
    
    
class IncentiveResult(models.Model):
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE)
    plan = models.ForeignKey(IncentivePlan, on_delete=models.CASCADE)
    context = models.ForeignKey(Context, on_delete=models.CASCADE)
    score = models.FloatField(null=False)
    amount = models.FloatField(null=False)
    attempt_number = models.IntegerField(null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    metric_breakdown = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["participant", "plan", "context", "attempt_number"],
                name="unique_attribute_number"
            )
        ]

    def __str__(self):
        return f"Participant {self.participant} in the plan {self.plan} scored {self.score} on attempt {self.attempt_number}"
    