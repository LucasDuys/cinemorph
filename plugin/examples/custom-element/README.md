# Custom Element Example: MyChart

A minimal example showing how to create and register a custom element for Morph Deck.

## What It Does

`MyChart.tsx` renders a simple bar chart with three quarters (Q1, Q2, Q3) and their values. Each bar is a `motion.rect` element with its own `layoutId`, so values tween smoothly between stages as you navigate the deck.

## Two Registration Paths

### Path 1: Convention-Based (Auto-Discovery)

Drop `MyChart.tsx` into `src/deck/elements/custom/`:

```
your-deck/
  src/deck/
    elements/
      custom/
        MyChart.tsx  ← filename auto-derives id "myChart"
```

The loader automatically discovers it and registers the id `myChart`. Use it in `stages.ts`:

```typescript
elements: {
  myChart: { pos: { left: '10%', top: '10%', width: '60%', height: '40%' }, shape: 'chart' }
}
```

### Path 2: Explicit Registry

Add an entry to `src/deck/elements/customRegistry.ts`:

```typescript
import MyChart from './custom/MyChart';

export const CUSTOM_ELEMENTS: CustomElementEntry[] = [
  {
    id: 'myChart',
    component: MyChart,
    defaultLayout: {
      pos: { left: '10%', top: '10%', width: '60%', height: '40%' },
      shape: 'chart'
    }
  }
];
```

Use the same id in `stages.ts`.

## Key Points

- **Filename → ID**: `MyChart.tsx` → `myChart` (first letter lowercase)
- **Motion tracking**: Every `motion.div` (including each bar) has a unique `layoutId` so morphs are FLIP-tracked across stages
- **Tokens not hex**: Uses Tailwind classes (`bg-accent`, `text-foreground`) from `tokens.ts`, not hardcoded colors
- **Component props**: Receives `{ layout, stage, layoutId }` for positioning and stage-awareness

## Customization

Edit `data` array for different values, modify the bar color by changing `bg-accent` to another token class, or add new bars by extending the data shape.
