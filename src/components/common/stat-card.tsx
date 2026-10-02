"use client";
import { Card } from "antd";
export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        <span className="stat-icon">{icon}</span>
      </div>
      {hint && (
        <div className="mt-4" style={{ fontSize: 12, color: "#647573" }}>
          {hint}
        </div>
      )}
    </Card>
  );
}
