/**
 * StatGroup
 *
 * Supported morph shapes: statGroup
 * Per-stage props: layout, stat values + labels
 * Stage-invariant: N-column flex, tabular numerals
 *
 * Visual rendering: T010 implementation — flexible stat row.
 */

type Stat = { value: string; label: string };

type StatGroupProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  stats: Stat[];
};

export default function StatGroup({ layout, stage, stats }: StatGroupProps) {
  return (
    <div className="flex h-full w-full items-stretch justify-around gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {stat.value}
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
