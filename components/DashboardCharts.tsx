"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { STATUS_META, STATUS_ORDER, type ApplicationStatus } from "@/lib/types";

const DOT: Record<string, string> = {
  new: "#0ea5e9",
  in_review: "#8b5cf6",
  offer_sent: "#f59e0b",
  bankruptcy: "#6366f1",
  restructuring: "#14b8a6",
  won: "#10b981",
  lost: "#f43f5e",
};

export function FunnelChart({ byStatus }: { byStatus: Record<ApplicationStatus, number> }) {
  const data = STATUS_ORDER.map((s) => ({ name: STATUS_META[s].label, key: s, value: byStatus[s] || 0 }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          formatter={(v: number) => [`${v}`, "Заявок"]}
        />
        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={18}>
          {data.map((d) => (
            <Cell key={d.key} fill={DOT[d.key]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RecommendPie({ recommend }: { recommend: Record<string, number> }) {
  const map: Record<string, { label: string; color: string }> = {
    bankruptcy: { label: "Банкротство", color: "#6366f1" },
    restructuring: { label: "Реструктуризация", color: "#14b8a6" },
    continue: { label: "Платить банкам", color: "#f59e0b" },
  };
  const data = Object.entries(recommend)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: map[k]?.label || k, value: v, color: map[k]?.color || "#94a3b8" }));
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ trend }: { trend: { date: string; count: number }[] }) {
  if (!trend.length) return <Empty />;
  const data = trend.map((t) => ({
    date: new Date(t.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    count: t.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
        <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#g)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <div className="grid h-[240px] place-items-center text-sm text-ink-400">Пока нет данных</div>;
}

export function LegendRow({ recommend }: { recommend: Record<string, number> }) {
  const map: Record<string, { label: string; color: string }> = {
    bankruptcy: { label: "Банкротство", color: "#6366f1" },
    restructuring: { label: "Реструктуризация", color: "#14b8a6" },
    continue: { label: "Платить банкам", color: "#f59e0b" },
  };
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {Object.entries(map).map(([k, m]) => (
        <span key={k} className="flex items-center gap-1.5 text-xs text-ink-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
          {m.label} · {recommend[k] || 0}
        </span>
      ))}
    </div>
  );
}
