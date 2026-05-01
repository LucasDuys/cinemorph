// Connector ID type. Plugin ships 10 first-class connectors; users can
// register more via the custom-element loader (T012).

export type ConnectorId =
  | 'drive' | 'slack' | 'github' | 'notion' | 'onedrive'
  | 'salesforce' | 'jira' | 'confluence' | 'teams' | 'linear';

export const CONNECTOR_IDS: ConnectorId[] = [
  'drive', 'slack', 'github', 'notion', 'onedrive',
  'salesforce', 'jira', 'confluence', 'teams', 'linear'
];

export const CONNECTOR_LABELS: Record<ConnectorId, string> = {
  drive: 'Google Drive',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  onedrive: 'OneDrive',
  salesforce: 'Salesforce',
  jira: 'Jira',
  confluence: 'Confluence',
  teams: 'Microsoft Teams',
  linear: 'Linear'
};
