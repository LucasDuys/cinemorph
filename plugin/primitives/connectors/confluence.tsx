// Confluence — simplified mark. Replace with official Atlassian brand SVG before public release.
import type { SVGProps } from 'react';

export default function ConfluenceIcon({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} {...rest}>
      <path
        fill="#0052CC"
        d="M2 16c0 1 1 2 2 2 1 0 2-1 3-3 1-2 3-4 5-4 2 0 4 1 5 3 1 2 2 3 3 3 1 0 2-1 2-2 0-2-2-5-5-7-3-2-7-2-10 0-3 2-5 5-5 8z"
      />
    </svg>
  );
}
