/**
 * MorphChart
 *
 * Supported morph shapes: morphChart
 * Per-stage props: layout, data, type ('bar' | 'line')
 * Stage-invariant: SVG rendering with motion layoutIds per datum
 *
 * Visual rendering: T010 implementation — hand-rolled SVG with motion elements.
 */
import { motion } from 'motion/react';

type ChartType = 'bar' | 'line';
type Datum = { id: string; value: number };

type MorphChartProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  type: ChartType;
  data: Datum[];
  width?: number;
  height?: number;
  max?: number;
};

export default function MorphChart({
  layout,
  stage,
  type,
  data,
  width = 200,
  height = 100,
  max = Math.max(1, ...data.map(d => d.value)),
}: MorphChartProps) {
  const barWidth = width / data.length;

  return (
    <svg className="h-full w-full text-foreground" viewBox={`0 0 ${width} ${height}`}>
      {type === 'bar' &&
        data.map((datum, i) => {
          const x = i * barWidth + 1;
          const barHeight = (datum.value / max) * height;
          const y = height - barHeight;
          return (
            <motion.rect
              key={datum.id}
              layoutId={`chart-${stage.id}-${datum.id}`}
              x={x}
              y={y}
              width={barWidth - 2}
              height={barHeight}
              fill="currentColor"
            />
          );
        })}

      {type === 'line' &&
        data.map((datum, i) => {
          const cx = (i / (data.length - 1 || 1)) * width;
          const cy = height - (datum.value / max) * height;
          return (
            <motion.circle
              key={datum.id}
              layoutId={`chart-${stage.id}-${datum.id}`}
              cx={cx}
              cy={cy}
              r={3}
              fill="currentColor"
            />
          );
        })}
    </svg>
  );
}
