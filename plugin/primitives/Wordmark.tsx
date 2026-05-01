/**
 * Wordmark
 *
 * Supported morph shapes: hero, chrome
 * Per-stage props: layout (position/size), text content, opacity
 * Stage-invariant: font family, brand color, letterforms
 *
 * Visual rendering: T010 implementation — hero or chrome size based on shape detection.
 */

type WordmarkProps = {
  layout: { left: string; top: string; width: string; height: string; shape?: string; opacity?: number };
  stage: { id: number; name: string };
  text: string;
};

export default function Wordmark({ layout, stage, text }: WordmarkProps) {
  const isHero = layout.shape === 'hero';
  const fontSize = isHero
    ? 'clamp(48px, 8vw, 120px)'
    : 'clamp(14px, 1.2vw, 22px)';
  const letterSpacing = isHero ? '-0.04em' : '-0.02em';

  return (
    <div className="flex h-full w-full items-center justify-center text-foreground font-bold">
      <span style={{ fontSize, letterSpacing }}>
        {text}
      </span>
    </div>
  );
}
