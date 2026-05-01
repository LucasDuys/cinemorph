// The persistent morphing canvas. Mounted once for the lifetime of the deck
// (Canvas is keyed stably — stage changes do NOT remount it). Every
// persistent element reads its layout from the active stage and morphs into
// place via Motion's layoutId + layout props. Frames render BEHIND the
// element layer in z-order and are stage-gated via stage.frames.{name}.
//
// The persistent layer is data-driven from `stage.elements` keys. Each id is
// dispatched through `renderElement` (see ./elements.tsx), which looks the
// id up in the element registry filled by T010 (built-in primitives) and
// T012 (custom-element loader). Unregistered ids resolve to the HIDDEN
// anchor so the morph chain stays alive.

import { LayoutGroup } from 'motion/react';
import type { ComponentType } from 'react';
import { renderElement } from './elements';
import * as frames from './frames';
import type { StageConfig } from './stages';

type FrameComponent = ComponentType<{ visible: boolean; stage: StageConfig }>;

// Map a stage.frames key (e.g. "hero") to the matching exported component
// name (e.g. "HeroFrame"). The composer can author additional frames; as
// long as they follow the `${Pascal}Frame` export convention, this lookup
// picks them up without changes here.
function frameComponent(name: string): FrameComponent | undefined {
  if (!name) return undefined;
  const exportName = `${name[0].toUpperCase()}${name.slice(1)}Frame`;
  return (frames as Record<string, unknown>)[exportName] as FrameComponent | undefined;
}

export function Canvas({ stage }: { stage: StageConfig }) {
  const frameEntries = Object.entries(stage.frames ?? {});

  return (
    <div className="absolute inset-0">
      {/* Top + bottom padding so the caption strip + step indicator never
          overlap morphing element content. */}
      <div className="relative mx-auto h-full w-full max-w-[1600px] px-8 pt-56 pb-20">
        <div className="relative h-full w-full">
          {/* Frames: behind the element layer */}
          {frameEntries.map(([name, on]) => {
            const FrameComp = frameComponent(name);
            if (!FrameComp) return null;
            return <FrameComp key={name} visible={on === true} stage={stage} />;
          })}

          {/* Persistent element layer — single LayoutGroup so every
              layoutId resolves across all members. Data-driven from
              stage.elements keys; unregistered ids fall through to the
              HIDDEN anchor inside renderElement. */}
          <LayoutGroup>
            {Object.keys(stage.elements).map((id) => renderElement(id, stage))}
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}
