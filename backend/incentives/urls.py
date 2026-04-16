from django.urls import path
from .api_views import *

urlpatterns = [
    path("create-participant/", CreateParticipantAPIView.as_view()),
    path("create-plan/", CreatePlanAPIView.as_view()),
    path("create-metric/", CreateMetricAPIView.as_view()),
    path("create-rule/", CreateRuleAPIView.as_view()),
    path("add-value/", AddMetricValueAPIView.as_view()),
    path("preview/", IncentivePreviewAPIView.as_view()),
    path("finalize/", IncentiveFinalizeAPIView.as_view()),
    path("history/", IncentiveHistoryAPIView.as_view()),
    path('simulate/', IncentiveSimulateAPIView.as_view()),
    path("setup-system/", SetupSystemAPIView.as_view()),
    path("participants/", ParticipantListAPIView.as_view()),
    path("plans/", PlanListAPIView.as_view()),
    path("contexts/", ContextListAPIView.as_view()),
    path("contexts/create/", CreateContextAPIView.as_view())
]
