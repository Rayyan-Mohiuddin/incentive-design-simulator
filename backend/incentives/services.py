from .models import Rule


def calculate_incentive(participant, incentive_plan, metric_values, weight_overrides=None):
    if weight_overrides is None:
        weight_overrides = {}

    rules = Rule.objects.filter(plan=incentive_plan, is_active=True)

    # 🔹 Collect metric values
    metric_data = {}
    for mv in metric_values:
        metric_data.setdefault(mv.metric, []).append(mv.value)

    # 🔹 Aggregate
    aggr_data = {}
    for metric, values in metric_data.items():
        if not values:
            continue

        method = metric.aggr_method

        if method == 'AVG':
            aggr_data[metric] = sum(values) / len(values)
        elif method == 'SUM':
            aggr_data[metric] = sum(values)
        elif method == 'MAX':
            aggr_data[metric] = max(values)
        elif method == 'MIN':
            aggr_data[metric] = min(values)

    # 🔹 Normalize
    normalized_data = {}
    for metric, value in aggr_data.items():
        if (
            metric.min_value is None
            or metric.max_value is None
            or metric.min_value == metric.max_value
        ):
            normalized_data[metric] = 1.0
            continue

        normalized = (value - metric.min_value) / (metric.max_value - metric.min_value)
        normalized = max(0.0, min(1.0, normalized))

        normalized_data[metric] = normalized

    # 🔹 Score
    score = 0
    met_breakdown = {}

    for rule in rules:
        metric_name = rule.metric.name
        weight = weight_overrides.get(metric_name, rule.weight)

        if rule.metric not in normalized_data:
            continue

        contribution = normalized_data[rule.metric] * (weight / 100)
        score += contribution

        met_breakdown[metric_name] = {
            "aggregated_value": aggr_data[rule.metric],
            "normalized_value": normalized_data[rule.metric],
            "rule_weight": weight,
            "contribution_to_score": contribution
        }

    # 🔹 Final payout
    variable_base = incentive_plan.variable_base_amount or 0

    final_incentive = (
        incentive_plan.fixed_base_amount
        + (variable_base * score)
    )

    return {
        "final_amount": final_incentive,
        "score": score,
        "metric_breakdown": met_breakdown
    }


def analyze_shock(base_performance, simulated_performance, weight_overrides):
    base_amount = base_performance["final_amount"]
    new_amount = simulated_performance["final_amount"]

    change_pct = (
        (new_amount - base_amount) / base_amount
        if base_amount != 0 else 0
    )

    max_weight = max(weight_overrides.values()) if weight_overrides else 0

    risk_score = 0
    insights = []

    if abs(change_pct) > 0.3:
        risk_score += 0.5
        insights.append("High payout volatility detected (>30%)")
    elif abs(change_pct) > 0.15:
        risk_score += 0.3
        insights.append("Moderate payout fluctuation (15–30%)")
    else:
        insights.append("Stable payout under simulation")

    if abs(change_pct) > 0.05:
        if max_weight > 70:
            risk_score += 0.4
            insights.append("Over-reliance on a single metric (>70%)")
        elif max_weight > 50:
            risk_score += 0.2
            insights.append("Moderate concentration on one metric")

    risk_score = min(risk_score, 1)

    if risk_score > 0.7:
        level = "HIGH"
    elif risk_score > 0.4:
        level = "MEDIUM"
    else:
        level = "LOW"

    suggested_weights = {}
    total = sum(weight_overrides.values()) if weight_overrides else 0

    if total > 0:
        for k, v in weight_overrides.items():
            suggested_weights[k] = round((v / total) * 100 * 0.9, 2)

    return {
    "change_pct": change_pct,
    "risk_score": round(risk_score * 100, 2),
    "risk_level": level,
    "suggested_weights": suggested_weights,
    "insights": insights,  
    "risk_delta": {
        "before": base_amount,
        "after": new_amount
    }
}