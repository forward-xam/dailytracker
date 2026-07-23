"use client";

interface ProgressRingProps {
  percent: number;
  size?: number;
  stroke?: number;
}

export function ProgressRing({
  percent,
  size = 160,
  stroke = 10,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      aria-label={`${percent}% complete`}
    >
      <svg width={size} height={size} className="progress-ring__svg">
        <circle
          className="progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="progress-ring__label">
        <span className="progress-ring__percent">{percent}%</span>
        <span className="progress-ring__sub">today</span>
      </div>
    </div>
  );
}
