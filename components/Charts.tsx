"use client";
import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
export default function Chart({
  data,
  label,
  line = false,
  controls,
}: {
  data: Record<string, string | number>[];
  label: string;
  line?: boolean;
  controls?: ReactNode;
}) {
  return (
    <div className="panel min-w-0 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{label}</h2>
        {controls}
      </div>
      {data.length ? (
        <div role="img" aria-label={label + " chart"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {line ? (
                <LineChart data={data}>
                  <CartesianGrid stroke="#303847" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#181c25",
                      color: "#f8fafc",
                      borderColor: "#303847",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={label}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#181c25", color: "#f8fafc" }}
                  />
                  <Bar
                    dataKey="value"
                    name={label}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <details className="mt-3 text-xs muted">
            <summary className="cursor-pointer">View chart data</summary>
            <ul className="mt-2 space-y-1">
              {data.map((p, i) => (
                <li key={i}>
                  {p.name}: {p.value}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : (
        <p className="py-14 text-center text-sm muted">
          No data yet. Your progress will appear here.
        </p>
      )}
    </div>
  );
}
