/**
 * Image
 *
 * Supported morph shapes: image
 * Per-stage props: layout, src, alt
 * Stage-invariant: object-fit behavior, aspect ratio constraints
 *
 * Visual rendering: T010 implementation — full img with object-cover + rounded.
 */

type ImageProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  src: string;
  alt: string;
};

export default function Image({ layout, stage, src, alt }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover rounded-lg"
    />
  );
}
