// Barrel for the 10 first-class connector logo components.
// Each is keyed by ConnectorId for ConnectorChip to look up.

import drive from './drive';
import slack from './slack';
import github from './github';
import notion from './notion';
import onedrive from './onedrive';
import salesforce from './salesforce';
import jira from './jira';
import confluence from './confluence';
import teams from './teams';
import linear from './linear';
import type { ConnectorId } from './types';

export const CONNECTOR_ICONS = {
  drive, slack, github, notion, onedrive,
  salesforce, jira, confluence, teams, linear
} as const;

export type ConnectorIconComponent = typeof CONNECTOR_ICONS[ConnectorId];

export { default as drive } from './drive';
export { default as slack } from './slack';
export { default as github } from './github';
export { default as notion } from './notion';
export { default as onedrive } from './onedrive';
export { default as salesforce } from './salesforce';
export { default as jira } from './jira';
export { default as confluence } from './confluence';
export { default as teams } from './teams';
export { default as linear } from './linear';
export * from './types';
