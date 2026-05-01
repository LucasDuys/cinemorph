// Salesforce — simplified cloud mark. Replace with official brand SVG before public release.
import type { SVGProps } from 'react';

export default function SalesforceIcon({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} {...rest}>
      <path
        fill="#00A1E0"
        d="M9.5 6.5a4 4 0 017.7 1.4 3 3 0 011.5 5.5 3 3 0 01-2 .6h-1a3 3 0 11-5.7-1.5 3 3 0 01.7.4 3 3 0 015 .9h.3a1.5 1.5 0 100-3 4 4 0 00-7-2.4 4 4 0 00-3 1 3 3 0 00-2 4.5 3 3 0 002.5 1.5h.5a3 3 0 010-1 2 2 0 01-.5-2 2 2 0 012-1 3 3 0 012.7-1.5 3 3 0 011.6.4 4 4 0 01-1.3-3.4z"
      />
    </svg>
  );
}
