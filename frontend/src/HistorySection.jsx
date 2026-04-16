import { useEffect, useState } from "react";

function HistorySection({ participantId, planId, context, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!participantId) return;

    async function fetchHistory() {
      setLoading(true);

      try {
        const url = new URL("http://localhost:8000/api/history/");

        url.searchParams.append("participant_id", participantId);

        if (planId) {
          if (planId && planId !== "") {
            url.searchParams.append("plan_id", planId);
          }
        }

        if (context) {
          if (context && context !== "") {
            url.searchParams.append("context", context);
          }
        }

        const res = await fetch(url);
        const data = await res.json();

        setHistory(data.history || []);
        setSelected([]); // reset selection when filters change

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [participantId, planId, context, refreshKey]);

  function toggleSelect(item) {
    if (selected.find((i) => i.id === item.id)) {
      setSelected(selected.filter((i) => i.id !== item.id));
    } else if (selected.length < 2) {
      setSelected([...selected, item]);
    }
  }

  const isSelected = (id) => selected.some((i) => i.id === id);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">History</h2>

      {loading && <p className="text-gray-500">Loading...</p>}

      {selected.length === 2 && (
        <div className="mb-6 rounded-2xl p-6 text-white 
          bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 
          shadow-lg relative overflow-hidden backdrop-blur-lg">

          {/* Glow */}
          <div className="absolute inset-0 opacity-20 bg-white blur-2xl"></div>

          <div className="relative z-10">

            <p className="text-sm opacity-80 mb-2">Comparison Insight</p>

            <h2 className="text-4xl font-bold">
              ₹ {selected[1].amount - selected[0].amount}
            </h2>

            <p className="mt-2 text-sm opacity-90">
              {selected[1].amount - selected[0].amount >= 0
                ? "Payout increased compared to selected attempt"
                : "Payout decreased compared to selected attempt"}
            </p>

            {/* 🔥 Comparison Bars */}
            <div className="mt-4 space-y-3">

              {[selected[0], selected[1]].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Attempt #{item.attempt_number}</span>
                    <span>₹ {item.amount}</span>
                  </div>

                  <div className="w-full bg-white/30 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full"
                      style={{
                        width: `${
                          (item.amount /
                            Math.max(selected[0].amount, selected[1].amount)) * 100
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}

            </div>

            {/* Score Delta */}
            <div className="mt-4 text-sm">
              Score change:{" "}
              <span className="font-semibold">
                {(selected[1].score - selected[0].score).toFixed(2)}
              </span>
            </div>

          </div>
        </div>
      )}

      {!loading && history.length === 0 && (
        <p className="text-gray-500">No history found</p>
      )}

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border shadow-sm transition bg-white
            ${item.score > 0.7 ? "border-l-4 border-l-purple-500" : ""}
            ${isSelected(item.id) ? "ring-2 ring-indigo-400" : ""}`}
          >

            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  Attempt #{item.attempt_number} | {item.context}
                </h3>

                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>

              <input
                type="checkbox"
                checked={isSelected(item.id)}
                onChange={() => toggleSelect(item)}
              />
            </div>

            <div className="flex gap-10 mt-4">
              <div>
                <p className="text-xs">Amount</p>
                <p className="font-bold">₹ {item.amount}</p>
              </div>

              <div>
                <p className="text-xs">Score</p>
                <p>{item.score}</p>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

export default HistorySection;