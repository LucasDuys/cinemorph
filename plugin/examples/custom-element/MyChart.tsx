// Example custom element: MyChart. A simple bar chart with three hardcoded
// values, rendered as motion.rect elements for morph compatibility.
//
// To use this in your deck:
// 1. Copy this file to src/deck/elements/custom/MyChart.tsx (auto-discovered)
//    or add an entry to src/deck/elements/customRegistry.ts (explicit)
// 2. Reference the id "myChart" in your stages.ts elements map
// 3. The default layout is 60% wide × 40% tall, centered-top. Override in stages.ts.

import { motion } from 'motion/react';
import type { ElementComponentProps } from '../../../scaffold-template/src/deck/elements';

type DataPoint = { label: string; value: number };

const data: DataPoint[] = [
  { label: 'Q1', value: 65 },
  { label: 'Q2', value: 78 },
  { label: 'Q3', value: 52 }
];

const maxValue = Math.max(...data.map((d) => d.value));

export default function MyChart({ layout, layoutId }: ElementComponentProps) {
  const barWidth = 22; // % of container width
  const barGap = 6; // % between bars
  const startOffset = (100 - (barWidth * data.length + barGap * (data.length - 1))) / 2;

  return (
    <motion.div
      layoutId={`${layoutId}-container`}
      layout
      className="relative w-full h-full bg-surface-subtle rounded-lg border border-border p-4"
    >
      {/* Title */}
      <div className="text-sm font-semibold text-foreground mb-4">
        Quarterly Performance
      </div>

      {/* Chart area */}
      <motion.div
        layoutId={`${layoutId}-bars`}
        layout
        className="relative w-full h-3/4 flex items-end justify-start gap-2"
      >
        {data.map((point, idx) => {
          const height = (point.value / maxValue) * 100;
          const left = startOffset + idx * (barWidth + barGap);

          return (
            <motion.div
              key={point.label}
              layoutId={`${layoutId}-bar-${idx}`}
              layout
              className="absolute bottom-0 rounded-t bg-accent"
              style={{
                left: `${left}%`,
                width: `${barWidth}%`,
                height: `${height}%`
              }}
            >
              {/* Label below bar */}
              <motion.div
                layoutId={`${layoutId}-label-${idx}`}
                layout
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap"
              >
                {point.label}
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Legend / Value display */}
      <motion.div
        layoutId={`${layoutId}-legend`}
        layout
        className="absolute bottom-1 right-2 text-xs text-muted-foreground"
      >
        {data.map((d) => `${d.label}: ${d.value}`).join(' | ')}
      </motion.div>
    </motion.div>
  );
}
