import React from 'react';
import { Shield, Database, Cpu, Route, Eye, Calendar, HardDrive, Terminal } from 'lucide-react';

export default function ArchitectureDocs() {
  return (
    <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="arch-docs-container">
      {/* Introduction */}
      <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6" id="arch-intro">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-red-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]" />
          <h2 className="text-xl font-bold tracking-tight text-white font-display">REDFORGE System Blueprint &amp; Specifications</h2>
        </div>
        <p className="text-[#8b949e] text-sm leading-relaxed">
          REDFORGE is an enterprise-grade Attack Surface Management (ASM) and continuous offensive security platform designed to discover, track, prioritize, and remediate digital asset exposures in real-time. This interactive specification details the normalized relational database structures, secure RESTful API architectures, and the phased deployment roadmap powering the platform.
        </p>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="arch-details-grid">
        {/* Module 1: Architecture & Tech Stack */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col space-y-4" id="arch-stack">
          <div className="flex items-center space-x-2 text-white font-bold border-b border-[#30363d] pb-3">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">1. High-Performance Architecture</h3>
          </div>
          <div className="space-y-3 text-xs text-[#8b949e]">
            <p>
              <strong className="text-white">Ingress Layer:</strong> Nginx reverse proxy managing SSL termination, rate-limiting, and security headers (HSTS, X-Frame-Options, CSP, XSS-Protection).
            </p>
            <p>
              <strong className="text-white">API Core:</strong> Fast, async Python <code className="text-yellow-500 bg-[#0d1117] px-1 py-0.5 rounded font-mono">FastAPI</code> server mounted with JWT bearer auth and stateless refresh token rotation.
            </p>
            <p>
              <strong className="text-white">Worker System:</strong> Redis pub/sub queue powering Celery distributed agents that manage background Nmap, Masscan, and Nuclei scanning workloads.
            </p>
            <p>
              <strong className="text-white">Frontend SPA:</strong> High-performance React 19 app compiled with Vite. Framer Motion drives intuitive layout transitions, and Tailwind CSS provides modular elegant UI components.
            </p>
          </div>
        </div>

        {/* Module 2: Complete Folder Structure */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col space-y-4" id="arch-folder">
          <div className="flex items-center space-x-2 text-white font-bold border-b border-[#30363d] pb-3">
            <Terminal className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">2. Repository Folder Structure</h3>
          </div>
          <pre className="text-[11px] font-mono bg-[#0d1117] p-4 rounded-lg overflow-x-auto text-[#e6edf3] border border-[#30363d] leading-relaxed">
{`redforge/
├── backend/                  # Python FastAPI Microservice
│   ├── app/
│   │   ├── api/v1/           # Versioned API routes
│   │   ├── core/             # JWT Auth, Config, Security Headers
│   │   ├── db/               # PostgreSQL Connection, Base Model
│   │   ├── models/           # SQLAlchemy Declarative Models
│   │   ├── schemas/          # Pydantic Schemas & Validators
│   │   └── tasks/            # Celery Scan Workflows
│   ├── alembic/              # Database Migrations
│   └── main.py               # Entry Point
├── frontend/                 # React Vite Client
│   ├── src/
│   │   ├── components/       # Reusable Atomic UI Blocks
│   │   ├── hooks/            # Custom Queries, Auth State
│   │   ├── layouts/          # Dashboard & Presentation Layouts
│   │   ├── types/            # TypeScript Interface Schema
│   │   ├── utils/            # Cryptographic & CVSS math helpers
│   │   └── App.tsx           # Global State Router
└── docker-compose.yml`}
          </pre>
        </div>

        {/* Module 3: Normalized PostgreSQL Schema */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 md:col-span-2 flex flex-col space-y-4" id="arch-schema">
          <div className="flex items-center space-x-2 text-white font-bold border-b border-[#30363d] pb-3">
            <Database className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">3. Relational Database Schema (SQLAlchemy/PostgreSQL DDL)</h3>
          </div>
          <p className="text-xs text-[#8b949e]">
            Our database utilizes normalized tables, strong foreign key constraints, automatic audit timestamp triggers, optimized indexes, soft-delete constraints, and UUID primary keys for advanced enterprise telemetry tracking.
          </p>
          <pre className="text-[11px] font-mono bg-[#0d1117] p-4 rounded-lg overflow-x-auto text-[#e6edf3] border border-[#30363d] max-h-72 overflow-y-auto leading-relaxed">
{`-- Primary User Table with Cryptographic Hashing
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'BLUE_TEAM',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asset Inventory (Domains, IPs, Servers, etc.)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(32) NOT NULL, -- 'DOMAIN', 'IP', 'URL', 'CLOUD_BUCKET'
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    criticality VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    environment VARCHAR(32) NOT NULL DEFAULT 'PRODUCTION',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Findings (Aligned with CVE, CWE, MITRE, OWASP)
CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(32) NOT NULL, -- 'CVE-2024-1242'
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    cvss NUMERIC(3, 1) NOT NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'IN_TRIAGE', 'RESOLVED'
    mitre_attack VARCHAR(128),
    cwe VARCHAR(128),
    owasp VARCHAR(128),
    proof_of_concept TEXT,
    recommendation TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning-fast lookups on high volumes
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_assets_address ON assets(address);
CREATE INDEX idx_users_email ON users(email);`}
          </pre>
        </div>

        {/* Module 4: RESTful API Specifications */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 md:col-span-2 flex flex-col space-y-4" id="arch-apis">
          <div className="flex items-center space-x-2 text-white font-bold border-b border-[#30363d] pb-3">
            <Route className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">4. REST API Endpoint Catalog (/api/v1)</h3>
          </div>
          <div className="overflow-x-auto" id="api-table-wrapper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#0d1117] text-[#8b949e] uppercase tracking-wider">
                  <th className="p-3">Method</th>
                  <th className="p-3">Endpoint Path</th>
                  <th className="p-3">Role Required</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
                <tr className="hover:bg-[#21262d]/40">
                  <td className="p-3 font-mono font-bold text-green-400">POST</td>
                  <td className="p-3 font-mono">/api/v1/auth/login</td>
                  <td className="p-3 text-[#8b949e]">Public</td>
                  <td className="p-3">Authenticates credentials, returns stateful Access and Refresh JWT cookies.</td>
                </tr>
                <tr className="hover:bg-[#21262d]/40">
                  <td className="p-3 font-mono font-bold text-blue-400">GET</td>
                  <td className="p-3 font-mono">/api/v1/assets</td>
                  <td className="p-3 text-blue-400">Security Analyst</td>
                  <td className="p-3">Retrieves paginated digital assets with filter queries.</td>
                </tr>
                <tr className="hover:bg-[#21262d]/40">
                  <td className="p-3 font-mono font-bold text-green-400">POST</td>
                  <td className="p-3 font-mono">/api/v1/assets</td>
                  <td className="p-3 text-red-400">Lead Pentester / Admin</td>
                  <td className="p-3">Registers newly identified attack surface boundaries to database.</td>
                </tr>
                <tr className="hover:bg-[#21262d]/40">
                  <td className="p-3 font-mono font-bold text-blue-400">GET</td>
                  <td className="p-3 font-mono">/api/v1/findings</td>
                  <td className="p-3 text-blue-400">Blue Team</td>
                  <td className="p-3">Gets security vulnerabilities mapped directly to corresponding assets.</td>
                </tr>
                <tr className="hover:bg-[#21262d]/40">
                  <td className="p-3 font-mono font-bold text-yellow-400">PUT</td>
                  <td className="p-3 font-mono">/api/v1/findings/&#123;id&#125;</td>
                  <td className="p-3 text-red-400">Lead Pentester</td>
                  <td className="p-3">Updates vulnerabilities (status, CVSS score details, POC evidence).</td>
                </tr>
                <tr className="hover:bg-[#21262d]/40">
                  <td className="p-3 font-mono font-bold text-blue-400">GET</td>
                  <td className="p-3 font-mono">/api/v1/reports/pdf</td>
                  <td className="p-3 text-purple-400">Security Manager</td>
                  <td className="p-3">Compiles dynamically populated Executive PDF summaries of active findings.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Module 5: UI Wireframe Plan */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col space-y-4" id="arch-ui-plan">
          <div className="flex items-center space-x-2 text-white font-bold border-b border-[#30363d] pb-3">
            <Eye className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">5. Responsive UX Wireframe Design</h3>
          </div>
          <div className="space-y-3 text-xs text-[#8b949e]">
            <p>
              <strong className="text-white">Sidebar Console Navigation:</strong> Fixed left rail containing REDFORGE logo, system indicator, module list (Dashboard, Assets, Findings, Assessments, Reporting, System Documentation) and active user profile.
            </p>
            <p>
              <strong className="text-white">Fluid Header Interface:</strong> Displays active workspace, real-time notification toaster with unread counter, search gateway, and system operational statuses.
            </p>
            <p>
              <strong className="text-white">Modular Workspace Grids:</strong> Layout transitions triggered smoothly using React hooks. Custom detail modals allow full CRUD configuration for nodes without blocking the interface context.
            </p>
          </div>
        </div>

        {/* Module 6: Commercial Roadmap */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col space-y-4" id="arch-roadmap">
          <div className="flex items-center space-x-2 text-white font-bold border-b border-[#30363d] pb-3">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">6. Development Roadmap</h3>
          </div>
          <div className="space-y-4" id="roadmap-timeline">
            <div className="flex space-x-3 items-start">
              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px] border border-green-500/20 font-bold uppercase">PHASE 1</span>
              <div>
                <h4 className="text-xs font-bold text-white">Interactive Shell &amp; Local Persistence</h4>
                <p className="text-[11px] text-[#8b949e]">Establish responsive multi-module navigation, modular state mechanisms, and comprehensive mock database tracking.</p>
              </div>
            </div>
            <div className="flex space-x-3 items-start">
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-[10px] border border-yellow-500/20 font-bold uppercase">PHASE 2</span>
              <div>
                <h4 className="text-xs font-bold text-white">Ingress Scanner Integration &amp; Webhooks</h4>
                <p className="text-[11px] text-[#8b949e]">Connect celery queues to nmap/nuclei binary streams. Dispatch discovery events to SIEM log pipelines via secure webhooks.</p>
              </div>
            </div>
            <div className="flex space-x-3 items-start">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] border border-blue-500/20 font-bold uppercase">PHASE 3</span>
              <div>
                <h4 className="text-xs font-bold text-white">Commercial SaaS Authentication &amp; Multi-Tenancy</h4>
                <p className="text-[11px] text-[#8b949e]">Integrate OAuth2/OIDC protocols, organization boundary scopes, and secure credential safes for tenant scanners.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
