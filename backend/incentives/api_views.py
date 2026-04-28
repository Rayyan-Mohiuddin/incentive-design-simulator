from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import get_object_or_404
from .models import (
    Participant,
    IncentivePlan,
    MetricValue,
    IncentiveResult,
    Metric,
    Rule,
    Context
)

from .serializers import IncentiveCalculationSerializer
from .services import calculate_incentive, analyze_shock


from django.db import transaction

class SetupSystemAPIView(APIView):
    def post(self, request):
        data = request.data

        try:
            with transaction.atomic():

                # 🔹 Validate
                if not data.get("participant_name"):
                    return Response({"error": "participant_name required"}, status=400)

                if not data.get("plan_name"):
                    return Response({"error": "plan_name required"}, status=400)

                if not data.get("metrics") or not data.get("values"):
                    return Response({"error": "metrics and values required"}, status=400)

                # 🔹 Create participant
                participant = Participant.objects.create(
                    name=data["participant_name"]
                )

                # 🔹 Create plan
                plan = IncentivePlan.objects.create(
                    name=data["plan_name"],
                    fixed_base_amount=data.get("fixed", 0),
                    variable_base_amount=data.get("variable", 0)
                )

                # 🔹 Context
                context_id = data.get("context")
                context_obj = Context.objects.filter(id=context_id).first()

                if not context_obj:
                    return Response({"error": "Invalid context"}, status=400)

                # 🔹 Metrics + Rules
                metric_ids = {}

                for m in data["metrics"]:
                    name = m.get("name", "").strip()

                    if not name:
                        return Response({"error": "Metric name required"}, status=400)

                    metric = Metric.objects.create(
                        name=name,
                        min_value=m.get("min"),
                        max_value=m.get("max"),
                        aggr_method="AVG"
                    )

                    metric_ids[name] = metric.id

                    Rule.objects.create(
                        plan=plan,
                        metric=metric,
                        weight=m.get("weight", 0),
                        is_active=True
                    )

                # 🔹 Metric Values
                for v in data["values"]:
                    metric_name = v.get("metric", "").strip()

                    if metric_name not in metric_ids:
                        return Response(
                            {"error": f"Metric '{metric_name}' not found"},
                            status=400
                        )

                    MetricValue.objects.create(
                        participant=participant,
                        metric_id=metric_ids[metric_name],
                        value=v.get("value", 0),
                        context=context_obj
                    )

                return Response({
                    "participant_id": participant.id,
                    "plan_id": plan.id
                })

        except Exception as e:
            return Response({"error": str(e)}, status=400)


class CreateParticipantAPIView(APIView):
    def post(self, request):
        name = request.data.get("name")

        if not name:
            return Response({"error": "Name required"}, status=400)

        p = Participant.objects.create(name=name)

        return Response({"id": p.id, "name": p.name})


class CreatePlanAPIView(APIView):
    def post(self, request):
        plan = IncentivePlan.objects.create(
            name=request.data.get("name"),
            fixed_base_amount=request.data.get("fixed_base_amount", 0),
            variable_base_amount=request.data.get("variable_base_amount", 0)
        )

        return Response({"id": plan.id, "name": plan.name})


class CreateMetricAPIView(APIView):
    def post(self, request):
        metric = Metric.objects.create(
            name=request.data.get("name"),
            min_value=request.data.get("min_value"),
            max_value=request.data.get("max_value"),
            aggr_method=request.data.get("aggr_method", "AVG")
        )

        return Response({"id": metric.id, "name": metric.name})


class CreateRuleAPIView(APIView):
    def post(self, request):
        rule = Rule.objects.create(
            plan_id=request.data.get("plan_id"),
            metric_id=request.data.get("metric_id"),
            weight=request.data.get("weight"),
            is_active=True
        )

        return Response({"id": rule.id})


class AddMetricValueAPIView(APIView):
    def post(self, request):
        context_obj = Context.objects.filter(id=request.data.get("context")).first()

        if not context_obj:
            return Response({"error": "Invalid context"}, status=400)

        obj = MetricValue.objects.create(
            participant_id=request.data.get("participant_id"),
            metric_id=request.data.get("metric_id"),
            value=request.data.get("value"),
            context=context_obj
        )

        return Response({"id": obj.id})


class IncentivePreviewAPIView(APIView):
    def post(self, request):
        serializer = IncentiveCalculationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        participant = get_object_or_404(Participant, id=data["participant_id"])
        plan = get_object_or_404(IncentivePlan, id=data["incentive_plan_id"])

        metric_values = MetricValue.objects.filter(
            participant=participant,
            context__id=data["context"]   
        )

        performance = calculate_incentive(participant, plan, metric_values)

        return Response(performance)


class IncentiveFinalizeAPIView(APIView):
    def post(self, request):
        serializer = IncentiveCalculationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        participant = get_object_or_404(Participant, id=data["participant_id"])
        plan = get_object_or_404(IncentivePlan, id=data["incentive_plan_id"])

        metric_values = MetricValue.objects.filter(
            participant=participant,
            context__id=data["context"]   
        )

        weight_overrides = request.data.get("weight_overrides", {})

        performance = calculate_incentive(
            participant,
            plan,
            metric_values,
            weight_overrides=weight_overrides
        )

        # attempt number
        last = IncentiveResult.objects.filter(
            participant=participant,
            plan=plan,
            context__id=data["context"]  
        ).order_by("-attempt_number").first()

        attempt = 1 if not last else last.attempt_number + 1

        context_id = data.get("context")

        if not context_id:
            return Response({"error": "Context is required"}, status=400)

        context_obj = Context.objects.filter(id=context_id).first()

        if not context_obj:
            return Response({"error": "Invalid context ID"}, status=400)

        result = IncentiveResult.objects.create(
            participant=participant,
            plan=plan,
            context=context_obj,
            score=performance["score"],
            amount=performance["final_amount"],
            attempt_number=attempt,
            metric_breakdown=performance["metric_breakdown"]
        )

        return Response(performance)


class IncentiveHistoryAPIView(APIView):
    def get(self, request):
        participant_id = request.query_params.get("participant_id")
        plan_id = request.query_params.get("plan_id")
        context = request.query_params.get("context")

        if not participant_id:
            return Response({"error": "participant_id is required"}, status=400)

        qs = IncentiveResult.objects.filter(participant_id=participant_id)

        if plan_id:
            qs = qs.filter(plan_id=plan_id)

        if context:
            qs = qs.filter(context__id=context)  # 🔥 FIX

        qs = qs.order_by("-created_at")

        history = [
            {
                "id": r.id,
                "plan": r.plan.name,
                "context": r.context.name,  # 🔥 FIX
                "attempt_number": r.attempt_number,
                "score": r.score,
                "amount": r.amount,
                "created_at": r.created_at,
                "metric_breakdown": r.metric_breakdown
            }
            for r in qs
        ]

        return Response({"history": history})


class IncentiveSimulateAPIView(APIView):
    def post(self, request):
        data = request.data

        participant = get_object_or_404(Participant, id=data.get("participant_id"))
        plan = get_object_or_404(IncentivePlan, id=data.get("incentive_plan_id"))

        base_context_id = data.get("base_context")
        shock_context_id = data.get("shock_context")

        if not base_context_id or not shock_context_id:
            return Response(
                {"error": "Both base_context and shock_context are required"},
                status=400
            )

        base_values = MetricValue.objects.filter(
            participant=participant,
            context__id=base_context_id
        )

        shock_values = MetricValue.objects.filter(
            participant=participant,
            context__id=shock_context_id
        )

        weight_overrides = data.get("weight_overrides", {})

        base = calculate_incentive(
            participant,
            plan,
            base_values,
            weight_overrides={}   
        )

        simulated = calculate_incentive(
            participant,
            plan,
            shock_values,
            weight_overrides=weight_overrides
        )

        if not simulated.get("metric_breakdown"):
            return Response({
                "error": "Metric breakdown empty. Check MetricValue or calculation logic."
            }, status=400)

        shock_analysis = analyze_shock(base, simulated, weight_overrides)

        print("BASE VALUES:", list(base_values.values()))
        print("SHOCK VALUES:", list(shock_values.values()))

        return Response({
            **simulated,
            "base": base,
            "delta": {
                "amount_change": simulated["final_amount"] - base["final_amount"]
            },
            "shock_analysis": shock_analysis
        })


class ParticipantListAPIView(APIView):
    def get(self, request):
        return Response([
            {"id": p.id, "name": p.name}
            for p in Participant.objects.all()
        ])


class PlanListAPIView(APIView):
    def get(self, request):
        return Response([
            {"id": p.id, "name": p.name}
            for p in IncentivePlan.objects.all()
        ])


class ContextListAPIView(APIView):
    def get(self, request):
        contexts = Context.objects.all()

        return Response([
            {"id": c.id, "name": c.name}
            for c in contexts
        ])
    

class CreateContextAPIView(APIView):
    def post(self, request):
        name = request.data.get("name")

        if not name:
            return Response({"error": "Name required"}, status=400)

        context = Context.objects.create(name=name)

        return Response({
            "id": context.id,
            "name": context.name
        })
    

class MetricListAPIView(APIView):
    def get(self, request):
        metrics = Metric.objects.all()
        data = [
            {
                "id": m.id,
                "name": m.name
            }
            for m in metrics
        ]
        return Response(data)