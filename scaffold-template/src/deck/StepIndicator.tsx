// Bottom step indicator — clickable dots showing deck progress.
// Backup stages are excluded from the count (R026.AC1).

export function StepIndicator({
  current,
  total,
  onNavigate
}: {
  current: number;
  total: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface-raised/80 px-4 py-2 backdrop-blur-sm">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className="group flex h-6 w-6 items-center justify-center"
            aria-label={`Go to slide ${i + 1}`}
          >
            <span
              className="block rounded-full transition-all bg-muted-foreground/40 data-[active=true]:bg-foreground"
              data-active={i === current}
              style={{
                width: i === current ? 24 : 6,
                height: 6
              }}
            />
          </button>
        ))}
        <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">
          {current + 1} / {total}
        </span>
      </div>
    </div>
  );
}
