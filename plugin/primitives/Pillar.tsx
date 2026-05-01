/**
 * Pillar
 *
 * Supported morph shapes: pillar
 * Per-stage props: layout, tag, title, sub
 * Stage-invariant: numbered card structure (tag > title > sub hierarchy)
 *
 * Visual rendering: T010 implementation — two-column flex with tag left, title+sub right.
 */

type PillarProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  tag: string;
  title: string;
  sub?: string;
};

export default function Pillar({ layout, stage, tag, title, sub }: PillarProps) {
  return (
    <div className="flex h-full w-full items-start gap-5 rounded-xl border border-border bg-surface-raised p-5 shadow-md">
      <span className="font-mono text-2xl font-semibold tabular-nums text-muted-foreground">
        {tag}
      </span>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-foreground">
          {title}
        </span>
        {sub && (
          <span className="text-sm text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
