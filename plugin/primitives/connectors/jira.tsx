// Jira — simplified diamond mark. Replace with official Atlassian brand SVG before public release.
import type { SVGProps } from 'react';

export default function JiraIcon({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} {...rest}>
      <path d="M12 1L23 12 12 23 1 12z" fill="#2684FF" />
      <path d="M12 6L18 12 12 18 6 12z" fill="#0052CC" />
    </svg>
  );
}
