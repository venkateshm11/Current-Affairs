import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// Category accuracy bars (weakest first). The lowest bar (index 0) is tinted to flag the weakest
// category. Category names are Gemini-generated content — Recharts renders them AS TEXT via the
// default axis label, never as HTML. Hex tokens from DESIGN_SYSTEM used directly (Recharts is SVG).
const CHART = {
  grid: '#e5e7eb',
  axis: '#9ca3af',
  tooltip: { bg: '#ffffff', border: '#d1d5db' },
  bars: ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'],
  barWeak: '#fee2e2',
};

export function WeakCategoriesChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="category" stroke={CHART.axis} tick={{ fontSize: 11, fill: CHART.axis }} />
          <YAxis domain={[0, 100]} stroke={CHART.axis} tick={{ fontSize: 11, fill: CHART.axis }} />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{
              backgroundColor: CHART.tooltip.bg,
              border: `1px solid ${CHART.tooltip.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.category}
                fill={index === 0 ? CHART.barWeak : CHART.bars[index % CHART.bars.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
