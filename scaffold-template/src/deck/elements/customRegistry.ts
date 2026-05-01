// Custom element registry. Explicit registrations for elements that don't
// follow the file-discovery convention (e.g. aliased ids, lazy-loaded,
// or hand-rolled components).
//
// Each entry is merged with auto-discovered elements from src/deck/elements/custom/*.tsx
// by loader.ts. If two ids collide, the loader throws at module-init.

import type React from 'react';
import type { ElementLayout } from '../stages';

export type CustomElementEntry = {
  id: string;
  component: React.FC<any>;
  defaultLayout: ElementLayout;
};

// Empty by default. Users can add explicit registrations here:
// export const CUSTOM_ELEMENTS: CustomElementEntry[] = [
//   {
//     id: 'myChart',
//     component: MyChart,
//     defaultLayout: { pos: { left: '10%', top: '10%', width: '80%', height: '60%' }, shape: 'chart' }
//   }
// ];

export const CUSTOM_ELEMENTS: CustomElementEntry[] = [];
