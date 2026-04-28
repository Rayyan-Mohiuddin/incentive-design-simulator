import { useState, useEffect } from "react";
import HistorySection from "./HistorySection";
import SetupPage from "./SetupPage";
import RiskMeter from "./RiskMeter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

function App() {

  const [page, setPage] = useState("setup");

  const [participantId, setParticipantId] = useState("");
  const [planId, setPlanId] = useState("");
  const [context, setContext] = useState("");

  const [participants, setParticipants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [metrics, setMetrics] = useState([]);

  const [previewData, setPreviewData] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [weightOverrides, setWeightOverrides] = useState({});

  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedMetric, setSelectedMetric] = useState("");
  const [metricInput, setMetricInput] = useState("");

  const [baseContext, setBaseContext] = useState("");
  const [shockContext, setShockContext] = useState("");

  // 🔥 FETCH ALL DATA
  useEffect(() => {
    async function fetchData() {
      try {
        const [m, p, pl, c] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/metrics/`),
          fetch(`${import.meta.env.VITE_API_URL}/api/participants/`),
          fetch(`${import.meta.env.VITE_API_URL}/api/plans/`),
          fetch(`${import.meta.env.VITE_API_URL}/api/contexts/`)
        ]);

        setMetrics(await m.json());
        setParticipants(await p.json());
        setPlans(await pl.json());
        setContexts(await c.json());

      } catch (err) {
        console.error("Fetch error:", err);
      }
    }

    fetchData();
  }, [refreshKey]);

  // 🔥 AUTO SIMULATE WHEN WEIGHTS CHANGE
  useEffect(() => {
    if (!previewData || !baseContext || !shockContext) return;
    handleSimulate();
  }, [weightOverrides, baseContext, shockContext, participantId, planId]);

  // 🔥 PREVIEW
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/preview/`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        participant_id: Number(participantId),
        incentive_plan_id: Number(planId),
        context: Number(baseContext)
      })
    });

    const data = await res.json();

    setPreviewData(data);

    const initialWeights = Object.fromEntries(
      Object.entries(data.metric_breakdown).map(([k, v]) => [k, v.rule_weight])
    );

    setWeightOverrides(initialWeights);
    setSimulationResult(null);

    setLoading(false);
  }

  // 🔥 SIMULATE
  async function handleSimulate() {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/simulate/`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        participant_id: Number(participantId),
        incentive_plan_id: Number(planId),
        base_context: Number(baseContext),
        shock_context: Number(shockContext),
        weight_overrides: weightOverrides
      })
    });

    const data = await res.json();
    setSimulationResult(data);
    console.log("Simulating with weights:", weightOverrides);
    console.log("Simulation Result:", data);
    console.log("SIM RESULT:", simulationResult);
    console.log("SIM RESULT:", data);
  }

  // 🔥 FINALIZE
  async function handleFinalize() {
    await fetch(`${import.meta.env.VITE_API_URL}/api/finalize/`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        participant_id: Number(participantId),
        incentive_plan_id: Number(planId),
        context: Number(baseContext)
      })
    });

    setRefreshKey(prev => prev + 1);
  }

  // 🔥 ADD METRIC VALUE
  async function handleAddMetricValue() {
    if (!context || !selectedMetric || metricInput === "") {
      alert("Fill all fields");
      return;
    }

    await fetch(`${import.meta.env.VITE_API_URL}/api/add-value/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        participant_id: Number(participantId),
        metric_id: Number(selectedMetric),
        value: Number(metricInput),
        context: Number(context)
      })
    });

    alert("Added!");
    setMetricInput("");
  }

  // 🔥 SETUP PAGE
  if (page === "setup") {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="p-4 flex justify-between bg-white shadow">
          <h1>Setup</h1>
          <button
            onClick={() => setPage("dashboard")}
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Dashboard →
          </button>
        </div>

        <SetupPage
          onSetupComplete={({ participantId, planId, context }) => {
            setParticipantId(participantId);
            setPlanId(planId);
            setBaseContext(context);
            setShockContext(context);

            setRefreshKey(prev => prev + 1);
            setPage("dashboard");
          }}
        />
      </div>
    );
  }

const chartData = simulationResult
  ? [
      { name: "Base", amount: simulationResult.base?.final_amount || 0 },
      { name: "Shock", amount: simulationResult.final_amount || 0 }
    ]
  : previewData
  ? [{ name: "Base", amount: previewData.final_amount }]
  : [];

  const totalWeight = Object.values(weightOverrides).reduce((a, b) => a + b, 0);

  function generateExplanation(shock) {
    if (!shock) return "";

    const { risk_level, change_pct } = shock;

    if (risk_level === "HIGH") {
      return `This incentive structure is highly unstable. A ${(change_pct * 100).toFixed(1)}% payout shift indicates strong dependence on specific metrics. Consider redistributing weights to reduce volatility.`;
    }

    if (risk_level === "MEDIUM") {
      return `Moderate variability detected. The system reacts to changes but remains somewhat stable. Fine-tuning weights can improve consistency.`;
    }

    return `The incentive system is stable under current conditions. The weight distribution provides balanced and predictable outcomes.`;
}
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={() => setPage("setup")}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          ← Setup
        </button>
      </div>

      {/* FORM */}
      <div className="bg-white p-5 rounded-2xl shadow mb-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">

          <select value={participantId} onChange={e => setParticipantId(Number(e.target.value))}>
            <option value="">Participant</option>
            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={planId} onChange={e => setPlanId(Number(e.target.value))}>
            <option value="">Plan</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={baseContext} onChange={e => setBaseContext(Number(e.target.value))}>
            <option value="">Base Context</option>
            {contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={shockContext} onChange={e => setShockContext(Number(e.target.value))}>
            <option value="">Shock Context</option>
            {contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <button className="col-span-3 bg-black text-white p-2 rounded-lg">
            {loading ? "Loading..." : "Preview"}
          </button>

        </form>
      </div>

      {/* ADD METRIC */}
      <div className="bg-white p-5 rounded-2xl shadow mb-6">
        <h3 className="font-semibold mb-3">Add Context Data</h3>

        <div className="grid grid-cols-4 gap-2">

          <select value={context} onChange={e => setContext(Number(e.target.value))}>
            <option value="">Context</option>
            {contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
            <option value="">Metric</option>
            {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <input
            type="number"
            value={metricInput}
            onChange={e => setMetricInput(e.target.value)}
          />

          <button onClick={handleAddMetricValue}>Add</button>

        </div>
      </div>

      {/* CHART */}
      {previewData && (
        <div className="bg-white p-5 rounded-2xl shadow mb-6">
          <h3 className="font-semibold mb-4">Impact Comparison</h3>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>

              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                </linearGradient>
              </defs>

              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />

              <Bar
                dataKey="amount"
                fill="url(#barGradient)"
                radius={[12, 12, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {simulationResult?.shock_analysis && (
        <div className="bg-white p-6 rounded-2xl shadow mb-6 space-y-4">

          <h3 className="font-semibold">Financial Shock Analysis</h3>

          <div className="grid md:grid-cols-3 gap-6 items-center">

            {/* Risk Meter */}
            <div className="flex flex-col items-center">
              <RiskMeter score={simulationResult.shock_analysis.risk_score} />

              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                simulationResult.shock_analysis.risk_level === "HIGH"
                  ? "bg-red-100 text-red-600"
                  : simulationResult.shock_analysis.risk_level === "MEDIUM"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-green-100 text-green-600"
              }`}>
                {simulationResult.shock_analysis.risk_level} RISK
              </span>
            </div>

            {/* Insights */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {simulationResult.shock_analysis.insights?.map((i, idx) => {

                let color = "bg-green-100 text-green-600";

                if (i.toLowerCase().includes("high") || i.toLowerCase().includes("over")) {
                  color = "bg-red-100 text-red-600";
                } else if (i.toLowerCase().includes("moderate")) {
                  color = "bg-yellow-100 text-yellow-600";
                }

                return (
                  <div key={idx} className={`p-3 rounded-xl text-sm ${color}`}>
                    {i}
                  </div>
                );
              })}
            </div>

          </div>

          {/* Delta Banner */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-xl">
            ₹ {simulationResult.shock_analysis.risk_delta?.before} → ₹ {simulationResult.shock_analysis.risk_delta?.after}
          </div>

          {/* Explanation */}
          <div className="bg-gray-50 p-4 rounded-xl text-sm border">
            {generateExplanation(simulationResult?.shock_analysis)}
          </div>

          {/* Button */}
          <button
            onClick={() => {
              setWeightOverrides(prev => ({
                ...prev,
                ...simulationResult.shock_analysis.suggested_weights
              }));
            }}
            className="w-full bg-black text-white p-2 rounded-xl shadow hover:bg-gray-900 transition"
          >
            Apply Suggested Weights
          </button>

        </div>
      )}

      {previewData && (
        <div className="bg-white p-5 rounded-2xl shadow mb-6">
          <h3 className="font-semibold mb-4">Adjust Weights</h3>

          {Object.entries(previewData.metric_breakdown).map(([name, data]) => (
            <div key={name} className="mb-4">

              <div className="flex justify-between text-sm mb-1">
                <span>{name}</span>
                <span>{weightOverrides[name]}%</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                className="w-full accent-indigo-500"
                value={weightOverrides[name]}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setWeightOverrides(prev => ({
                    ...prev,
                    [name]: value
                  }));
                }}
              />
            </div>
          ))}

          <button
            onClick={handleFinalize}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
          >
            Finalize & Save
          </button>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow">
        <HistorySection
          participantId={participantId}
          planId={planId}
          context={context}
          refreshKey={refreshKey}
        />
      </div>

    </div>
  );
}

export default App;