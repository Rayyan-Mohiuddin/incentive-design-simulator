import { useEffect, useState } from "react";

export default function RiskMeter({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const interval = setInterval(() => {
      start += 2;
      if (start >= score) {
        start = score;
        clearInterval(interval);
      }
      setAnimatedScore(start);
    }, 10);

    return () => clearInterval(interval);
  }, [score]);

  const radius = 60;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#eee"
          strokeWidth={stroke}
          fill="none"
        />

        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="url(#grad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />

        <defs>
          <linearGradient id="grad">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      <div className="text-2xl font-bold mt-2">
        {Math.round(animatedScore)}%
      </div>

      <p className="text-sm text-gray-500">Risk Score</p>
    </div>
  );
}