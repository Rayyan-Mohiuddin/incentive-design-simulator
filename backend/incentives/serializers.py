from rest_framework import serializers

class IncentiveCalculationSerializer(serializers.Serializer):
    participant_id = serializers.IntegerField()
    incentive_plan_id = serializers.IntegerField()
    context = serializers.IntegerField()