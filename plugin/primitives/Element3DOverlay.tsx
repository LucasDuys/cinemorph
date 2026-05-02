/**
 * Element3DOverlay
 *
 * Fixed-position overlay container portalled to document.body that
 * renders above the 2D canvas at z-index 50 with pointer-events none
 * (R008.AC4). The overlay exists so 2D and 3D content coexist — the
 * WebGL canvas is transparent and layered above the Framer Motion
 * stage, not a replacement for it.
 *
 * SSR safety: if `document` is undefined (server-side rendering or test
 * environments without DOM), the component returns null and does not
 * attempt to create a portal (R008.AC4 guardrail).
 */

import React, { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Element3DOverlayProps {
  children: ReactNode;
}

/**
 * Portal wrapper that mounts 3D element children directly on document.body
 * at z-index 50. Returns null on the server or when the DOM is unavailable.
 */
export default function Element3DOverlay({ children }: Element3DOverlayProps): React.ReactElement | null {
  // SSR / test guard: document may not exist in non-browser environments.
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      aria-hidden="true"
    >
      {children}
    </div>,
    document.body,
  );
}
