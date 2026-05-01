/**
 * Logo
 *
 * Supported morph shapes: logo
 * Per-stage props: layout, src, alt
 * Stage-invariant: aspect ratio preserved, brand asset
 *
 * Visual rendering: T010 implementation — centered img with object-contain.
 */

type LogoProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  src?: string;
  alt: string;
};

export default function Logo({ layout, stage, src, alt }: LogoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {src && (
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
        />
      )}
    </div>
  );
}
