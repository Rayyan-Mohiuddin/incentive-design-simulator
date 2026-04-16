import { useState, useEffect } from "react";

function SetupPage({ onSetupComplete }) {
  const [participantName, setParticipantName] = useState("");
  const [planName, setPlanName] = useState("");
  const [fixed, setFixed] = useState(1000);
  const [variable, setVariable] = useState(5000);
  const [newContextName, setNewContextName] = useState("");

  const [contexts, setContexts] = useState([]);
  const [context, setContext] = useState("");

  const [metrics, setMetrics] = useState([
    { name: "Sales", min: 0, max: 100, weight: 70, value: 50 },
    { name: "Attendance", min: 0, max: 30, weight: 30, value: 20 }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchContexts() {
        const res = await fetch("http://localhost:8000/api/contexts/");
        const data = await res.json();
        setContexts(data);
    }

    fetchContexts();
    }, []);

  function updateMetric(index, field, value) {
    const updated = [...metrics];
    updated[index][field] = value;
    setMetrics(updated);
  }

  function addMetric() {
    setMetrics([
      ...metrics,
      { name: "", min: 0, max: 100, weight: 50, value: 0 }
    ]);
  }

  async function handleCreateSystem() {
    setLoading(true);

    if (!context) {
        alert("Context is required");
        return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/setup-system/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          participant_name: participantName,
          plan_name: planName,
          fixed: Number(fixed),
          variable: Number(variable),
          context: Number(context),

          metrics: metrics.map(m => ({
            name: m.name,
            min: Number(m.min),
            max: Number(m.max),
            weight: Number(m.weight)
          })),

          values: metrics.map(m => ({
            metric: m.name,
            value: Number(m.value)
          }))
        })
      });

      const data = await res.json();

      // 🔥 pass IDs to dashboard
      onSetupComplete({
        participantId: data.participant_id,
        planId: data.plan_id,
        context: context
      });

    } catch (err) {
      console.error(err);
      alert("Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateContext() {
    if (!newContextName.trim()) return;

    const res = await fetch("http://localhost:8000/api/contexts/create/", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newContextName })
    });

    const data = await res.json();

    setContexts(prev => [...prev, data]);
    setContext(data.id);  // auto-select new context
    setNewContextName("");
}

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      <h1 className="text-2xl font-bold mb-6">Create Incentive System</h1>

      {/* BASIC INFO */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <h2 className="font-semibold mb-3">Basic Info</h2>

        <input
          placeholder="Participant Name"
          className="border p-2 w-full mb-2"
          onChange={e => setParticipantName(e.target.value)}
        />

        <input
          placeholder="Plan Name"
          className="border p-2 w-full mb-2"
          onChange={e => setPlanName(e.target.value)}
        />

        <input
          placeholder="Fixed Amount"
          className="border p-2 w-full mb-2"
          onChange={e => setFixed(e.target.value)}
        />

        <input
          placeholder="Variable Amount"
          className="border p-2 w-full mb-2"
          onChange={e => setVariable(e.target.value)}
        />

        <div className="flex gap-2">

        <select
            className="border p-2 w-full"
            value={context}
            onChange={e => setContext(e.target.value)}
        >
            <option value="">Select Context</option>
            {contexts.map(c => (
            <option key={c.id} value={c.id}>
                {c.name}
            </option>
            ))}
        </select>

        <input
            placeholder="New Context"
            value={newContextName}
            onChange={e => setNewContextName(e.target.value)}
            className="border p-2"
        />

        <button
            onClick={handleCreateContext}
            className="bg-black text-white px-3 rounded"
        >
            +
        </button>

        </div>
      </div>

      {/* METRICS */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <h2 className="font-semibold mb-3">Metrics</h2>

        {metrics.map((m, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 mb-2">

            <input placeholder="Name"
              value={m.name}
              onChange={e => updateMetric(i, "name", e.target.value)}
              className="border p-2" />

            <input placeholder="Min"
              value={m.min}
              onChange={e => updateMetric(i, "min", e.target.value)}
              className="border p-2" />

            <input placeholder="Max"
              value={m.max}
              onChange={e => updateMetric(i, "max", e.target.value)}
              className="border p-2" />

            <input placeholder="Weight"
              value={m.weight}
              onChange={e => updateMetric(i, "weight", e.target.value)}
              className="border p-2" />

            <input placeholder="Value"
              value={m.value}
              onChange={e => updateMetric(i, "value", e.target.value)}
              className="border p-2" />

          </div>
        ))}

        <button
          onClick={addMetric}
          className="mt-2 text-blue-600"
        >
          + Add Metric
        </button>
      </div>

      {/* SUBMIT */}
      <button
        onClick={handleCreateSystem}
        className="bg-black text-white px-6 py-3 rounded-xl w-full"
      >
        {loading ? "Creating..." : "🚀 Create System"}
      </button>

    </div>
  );
}

export default SetupPage;