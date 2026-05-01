/**
 * Chart
 *
 * Supported morph shapes: chart
 * Per-stage props: layout, data, type ('kpi' | 'bar' | 'line' | 'area')
 * Stage-invariant: axis treatment, brand colors
 *
 * Visual rendering: T010 implementation — placeholder for Recharts (follow-up).
 */

type ChartType = 'kpi' | 'bar' | 'line' | 'area';
type ChartDatum = { label: string; value: number };

type ChartProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  type: ChartType;
  data: ChartDatum[];
};

export default function Chart({ layout, stage, type, data }: ChartProps) {
  // TODO(T010-followup): wire up Recharts when added to deps
  if (type === 'kpi' && data.length > 0) {
    const datum = data[0];
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <span className="text-5xl font-bold tabular-nums text-foreground">
          {datum.value}
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {datum.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      [Chart: {type}]
    </div>
  );
}
