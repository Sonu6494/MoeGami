"use client";

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  fullyCompleted?: boolean;
}

export default function ProgressBar({
  percentage,
  showLabel = true,
  size = "md",
  fullyCompleted = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const heightClass = size === "sm" ? "h-1" : size === "lg" ? "h-3" : "h-2";

  const fillClass =
    clamped === 0
      ? "bg-white/10"
      : fullyCompleted
        ? "bg-gradient-to-r from-[#FFD700] to-[#FFA500]"
        : clamped === 100
          ? "bg-[var(--success)]"
          : "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)]";

  const fillWidth = clamped === 0 ? "100%" : `${clamped}%`;

  return (
    <div className="w-full">
      {showLabel && (
        <p className="mb-1 text-right text-xs tabular-nums text-[var(--text-secondary)]">
          {clamped}%
        </p>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-white/10 ${heightClass}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
          style={{ width: fillWidth }}
        />
      </div>
    </div>
  );
}
