export type AssetType = 'Domain' | 'IP' | 'URL' | 'Cloud' | 'Server' | 'Application' | 'Subdomain' | 'CIDR' | 'API Endpoint' | 'Repository';
export type CriticalityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type EnvironmentType = 'Production' | 'Staging' | 'Development';
export type FindingStatus = 'Open' | 'In Triage' | 'Assigned' | 'Resolved' | 'Closed';
export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type AssessmentStatus = 'Scheduled' | 'Active' | 'Completed';
export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Analyst' | 'Pentester' | 'Viewer' | 'Administrator' | 'Lead Pentester' | 'Security Analyst' | 'Security Manager' | 'Blue Team Responder';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  address: string;
  criticality: CriticalityLevel;
  environment: EnvironmentType;
  tags: string[];
  lastScanned: string;
  status: 'Active' | 'Inactive';
  owner?: string;
  technology?: string;
  operatingSystem?: string;
}

export interface Finding {
  id: string;
  identifier: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  cvss: number;
  asset: string;
  status: FindingStatus;
  mitreAttack: string;
  cwe: string;
  owasp: string;
  proofOfConcept: string;
  recommendation: string;
  references: string[];
  assignedTo?: string;
  discoveredAt: string;
  evidence?: string;
  comments?: { id: string; user: string; text: string; timestamp: string }[];
  history?: { id: string; user: string; action: string; timestamp: string }[];
  attachments?: string[];
}

export interface Assessment {
  id: string;
  name: string;
  scope: string[];
  rulesOfEngagement: string;
  status: AssessmentStatus;
  progress: number;
  startDate: string;
  endDate: string;
  assignedTeam: string[];
  findingsCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  browser: string;
  severity: 'Info' | 'Warning' | 'Critical';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Suspended';
  avatar: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  health: 'Healthy' | 'Degraded' | 'Critical';
  status: 'Active' | 'Archived' | 'Draft';
  scope: string[];
  rulesOfEngagement: string;
  assetsCount: number;
  findingsCount: { Critical: number; High: number; Medium: number; Low: number };
  assessmentsCount: number;
  team: string[];
  notes: string;
  createdAt: string;
  activity: { id: string; text: string; timestamp: string; user: string }[];
}
