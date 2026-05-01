/**
 * ConnectorChip
 *
 * Supported morph shapes: orbit, cluster, pipeline, footer
 * Per-stage props: layout (position/size/shape), opacity
 * Stage-invariant: brand color, logo identity, label text
 *
 * Renders a connector tile (Drive, Slack, GitHub, Notion, OneDrive, Salesforce,
 * Jira, Confluence, Teams, Linear) in one of four shape modes. The outer
 * motion wrapper is provided by MorphBox in elements.tsx — this component
 * renders the inner chip content.
 */
import { CONNECTOR_ICONS, CONNECTOR_LABELS, type ConnectorId } from './connectors';
import type { ElementLayout, StageConfig } from '../../scaffold-template/src/deck/stages';

type ConnectorChipProps = {
  layoutId?: string;
  layout: ElementLayout;
  stage: StageConfig;
  id: ConnectorId;
  brandColor?: string;
  label?: string;
};

export default function ConnectorChip({ layout, id, brandColor, label }: ConnectorChipProps) {
  const Icon = CONNECTOR_ICONS[id];
  const displayLabel = label ?? CONNECTOR_LABELS[id];
  const shape = layout.shape;

  // Pill-style chip for pipeline (icon + text)
  if (shape === 'pipeline') {
    return (
      <div
        className="flex h-full w-full items-center gap-2 rounded-xl border bg-surface-raised px-3 shadow-md"
        style={{ borderColor: brandColor ?? 'var(--border)', color: 'var(--foreground)' }}
        title={displayLabel}
      >
        <span className="flex-shrink-0">
          <Icon size={20} />
        </span>
        <span className="truncate text-sm font-medium">{displayLabel}</span>
      </div>
    );
  }

  if (shape === 'footer') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-md border bg-surface-raised"
        style={{ borderColor: 'var(--border)' }}
        title={displayLabel}
      >
        <Icon size={14} />
      </div>
    );
  }

  // Cluster: icon + brand-color rim
  if (shape === 'cluster') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-xl border-2 bg-surface-raised shadow-md"
        style={{ borderColor: brandColor ?? 'var(--border)' }}
        title={displayLabel}
      >
        <Icon size={20} />
      </div>
    );
  }

  // Default: orbit — icon-only, subtle rim
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-xl border bg-surface-raised shadow-sm"
      style={{ borderColor: 'var(--border)' }}
      title={displayLabel}
    >
      <Icon size={18} />
    </div>
  );
}
