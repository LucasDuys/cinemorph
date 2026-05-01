// Microsoft Teams — simplified T-tile mark. Replace with official brand SVG before public release.
import type { SVGProps } from 'react';

export default function TeamsIcon({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} {...rest}>
      <rect x="2" y="4" width="14" height="16" rx="2" fill="#5059C9" />
      <text x="9" y="16" fontSize="11" fontWeight="700" fill="#FFFFFF" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">T</text>
      <circle cx="19" cy="9" r="3" fill="#7B83EB" />
    </svg>
  );
}
