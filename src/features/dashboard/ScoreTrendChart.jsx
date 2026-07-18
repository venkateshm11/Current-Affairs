import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// Recharts renders SVG — Tailwind classes do not apply inside it, so the DESIGN_SYSTEM CHART
// hex tokens are used here directly (the single sanctioned place for literal hex). Line only —
// no area fill (DESIGN_SYSTEM: area fill makes the trend feel heavy). No dangerouslySetInnerHTML.
const CHART = {
  line: '#18181b',
  grid: '#e5e7eb',
  axis: '#9ca3af',
  tooltip: { bg: '#ffffff', border: '#d1d5db' },
};

export function ScoreTrendChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" stroke={CHART.axis} tick={{ fontSize: 11, fill: CHART.axis }} />
          <YAxis domain={[0, 100]} stroke={CHART.axis} tick={{ fontSize: 11, fill: CHART.axis }} />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART.tooltip.bg,
              border: `1px solid ${CHART.tooltip.border}`,
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="score" stroke={CHART.line} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
