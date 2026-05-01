// Top caption strip — eyebrow + headline + sub. Cross-fades on stage change
// independently of the element morph so headline copy reads cleanly
// (R013.AC2). Reads stage.caption.{eyebrow, headline, sub?, hidden?}; when
// `hidden` is true, renders nothing. All colors and fonts come from Tailwind
// theme tokens — no hardcoded hex.

import { motion, AnimatePresence } from 'motion/react';
import type { StageConfig } from './stages';
import { CAPTION_FADE } from './pace';

export function Caption({ stage }: { stage: StageConfig }) {
  const hidden = stage.caption.hidden === true;

  return (
    <div data-caption-strip className="pointer-events-none absolute inset-x-0 top-0 z-10 px-12 pt-12">
      <div className="mx-auto max-w-[1500px]">
        <AnimatePresence mode="wait">
          {!hidden && (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={CAPTION_FADE}
              className="flex flex-col gap-3"
            >
              <span className="font-mono text-caption uppercase tracking-[0.22em] text-muted-foreground">
                {stage.caption.eyebrow}
              </span>
              <h1
                className="max-w-[26ch] text-balance text-display-xl font-semibold leading-tight text-foreground"
                style={{ letterSpacing: '-0.01em' }}
              >
                {stage.caption.headline}
              </h1>
              {stage.caption.sub && (
                <p className="max-w-[60ch] text-balance text-body leading-relaxed text-muted-foreground">
                  {stage.caption.sub}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
