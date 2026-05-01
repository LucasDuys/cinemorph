/**
 * KPI
 *
 * Supported morph shapes: kpi
 * Per-stage props: layout, value, label
 * Stage-invariant: tabular numerals, hierarchy (number > label)
 *
 * Visual rendering: T010 implementation — big number + small label stacked.
 */

type KPIProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  value: string;
  label: string;
};

export default function KPI({ layout, stage, value, label }: KPIProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <span className="text-5xl font-bold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
