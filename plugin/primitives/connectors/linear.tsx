// Linear — simplified orbital ring mark. Replace with official Linear brand SVG before public release.
import type { SVGProps } from 'react';

export default function LinearIcon({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} {...rest}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#5E6AD2" strokeWidth="1.5" />
      <path
        d="M3 13a9 9 0 008 8M3 9a9 9 0 0112 12M9 3a9 9 0 0112 12"
        stroke="#5E6AD2"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
