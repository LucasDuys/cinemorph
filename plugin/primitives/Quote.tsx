/**
 * Quote
 *
 * Supported morph shapes: quote
 * Per-stage props: layout, text, attribution
 * Stage-invariant: italic body, attribution placement
 *
 * Visual rendering: T010 implementation — quote text with optional attribution.
 */

type QuoteProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  text: string;
  attribution?: string;
};

export default function Quote({ layout, stage, text, attribution }: QuoteProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 rounded-xl border border-border bg-surface-raised px-5 py-4 shadow-md">
      {attribution && (
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {attribution}
        </span>
      )}
      <span className="text-lg font-medium leading-snug text-foreground italic">
        "{text}"
      </span>
    </div>
  );
}
