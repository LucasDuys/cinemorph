// Local element barrel for the scaffold-template. The composer (T015) and
// the full primitive impl pass (T010) populate this file with concrete
// React components keyed by element id, and call `registerElement(id, Component)`
// from `../elements.tsx` to wire them into the persistent layer.
//
// Custom-element loader (T012) is imported here so it runs at scaffold startup,
// discovering .tsx files in src/deck/elements/custom/ and registering them
// automatically. This import ensures loadCustomElements() runs before Canvas mounts.
//
// TODO(T010): Copy plugin/primitives/* into this folder at scaffold-build
// time and re-export them here, then call `registerElement` for each.

import './loader';

export {};
