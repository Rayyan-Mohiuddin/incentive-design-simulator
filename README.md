# Incentive Design Simulator

A scenario-based incentive simulation system that evaluates how incentive structures perform under changing real-world conditions and helps redesign them to reduce financial risk.

---

## Overview

This project models how incentive systems behave under different scenarios (contexts), such as normal conditions versus disruptive events (e.g., COVID-19).

Instead of only calculating payouts, the system focuses on answering:

**How stable is an incentive system when real-world conditions change?**

---

## Key Features

### Incentive Calculation Engine

* Aggregates and normalizes metric values
* Computes weighted scores
* Calculates final incentive payouts

---

### Multi-Context Simulation

* Compares **Base Context (normal conditions)** with **Shock Context (disruption)**
* Supports real-world scenario modeling (e.g., Pre-COVID vs COVID Lockdown)

---

### Dynamic Weight Adjustment

* Allows modification of metric importance
* Updates simulation results in real time
* Helps explore trade-offs between performance and stability

---

### Financial Shock Analysis

* Measures payout volatility
* Computes a risk score
* Classifies risk levels: Low, Medium, High
* Generates explanatory insights

---

### Suggested Weight Adjustment

* Provides conservative weight adjustments
* Preserves original system structure
* Aims to reduce fragility rather than aggressively optimize

---

### Visualization Dashboard

* Base vs Shock comparison charts
* Risk indicator
* Insight summaries
* Historical simulation tracking

---

## Core Concept

The system is based on the principle:

**Performance does not imply stability.**

An incentive system that performs well under normal conditions may fail under disruption. This project identifies and helps correct that gap.

---

## Example Use Case (Uber during COVID-19)

| Metric          | Pre-COVID | COVID Lockdown |
| --------------- | --------- | -------------- |
| Ride Demand     | High      | Low            |
| Delivery Demand | Low       | High           |

A system heavily weighted toward ride demand becomes unstable during COVID.
Rebalancing weights toward delivery demand improves resilience.

---

## Tech Stack

### Backend

* Django
* Django REST Framework
* SQLite

### Frontend

* React
* Tailwind CSS
* Recharts

---

## Project Structure

```
Incentive-Design-Simulator/
├── backend/
├── frontend/
├── README.md
└── .gitignore
```

---

## Setup Instructions

### Backend

```
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

### Frontend

```
cd frontend
npm install
npm run dev
```

---

## What Makes This Project Distinct

* Scenario-based simulation rather than static calculation
* Focus on system robustness under uncertainty
* Real-world modeling of disruption scenarios
* Interactive exploration of design trade-offs

---

## Future Improvements

* Advanced weight optimization strategies
* Metric volatility analysis
* Multi-scenario comparison
* Cloud deployment

---

## Author

Rayyan Mohiuddin
