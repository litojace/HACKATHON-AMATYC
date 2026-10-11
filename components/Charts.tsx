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
  id,
}: {
  data: Record<string, string | number>[];
  label: string;
  line?: boolean;
  controls?: ReactNode;
  id?: string;
}) {
  const isPercent = label.includes("(%)");
  return (
    <div id={id} className="panel min-w-0 scroll-mt-24 p-5">
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
                  <CartesianGrid stroke="var(--edge)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      color: "var(--text)",
                      borderColor: "var(--edge)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={label}
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--panel)", color: "var(--text)" }}
                  />
                  <Bar
                    dataKey="value"
                    name={label}
                    fill="var(--accent)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <ul aria-label={`${label} values`} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.map((point, index) => {
              const count = typeof point.count === "number" ? point.count : null;
              return (
                <li key={`${point.name}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-edge bg-ink px-3 py-2.5">
                  <span className="truncate text-sm">{point.name}</span>
                  <span className="shrink-0 text-right">
                    <strong className="font-mono text-base font-semibold text-[var(--accent-text)]">
                      {count === 0 ? "—" : `${point.value}${isPercent ? "%" : ""}`}
                    </strong>
                    {count !== null && <span className="ml-2 text-xs muted">{count === 0 ? "No attempts" : `${count} attempts`}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="py-14 text-center text-sm muted">
          No data yet. Your progress will appear here.
        </p>
      )}
    </div>
  );
}
