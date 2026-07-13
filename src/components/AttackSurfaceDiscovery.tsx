import React, { useState, useEffect } from 'react';
import { Asset, AuditLog } from '../types';
import { 
  Globe, Server, Shield, Network, RefreshCw, 
  Activity, Search, Terminal, Cpu, Info, CheckCircle, 
  AlertTriangle, Lock, Eye, Key, Database, Play
} from 'lucide-react';

interface DiscoveryNode {
  id: string;
  name: string;
  type: 'Domain' | 'Subdomain' | 'IP' | 'Port' | 'Service';
  address: string;
  dnsRecords?: string[];
  sslCert?: {
    issuer: string;
    validTo: string;
    strength: string;
  };
  whois?: {
    registrar: string;
    asn: string;
    org: string;
  };
  headers?: { [key: string]: string };
  techFingerprint?: string[];
  openPorts?: number[];
  connectedTo?: string; // parent node ID
}

interface AttackSurfaceDiscoveryProps {
  assets: Asset[];
  onAddAsset: (asset: Omit<Asset, 'id' | 'lastScanned'>) => void;
}

export default function AttackSurfaceDiscovery({ assets, onAddAsset }: AttackSurfaceDiscoveryProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-root');

  // Hardcoded discovery network dataset for deep interactive exploration
  const [discoveryNodes, setDiscoveryNodes] = useState<DiscoveryNode[]>([
    {
      id: 'node-root',
      name: 'Primary Perimeter Root',
      type: 'Domain',
      address: 'reforge.io',
      dnsRecords: ['A 104.21.32.180', 'MX mail.reforge.io', 'TXT v=spf1 include:_spf.google.com ~all'],
      sslCert: { issuer: "Let's Encrypt Authority X3", validTo: "2026-10-15", strength: "ECDSA 256-bit" },
      whois: { registrar: "MarkMonitor Inc.", asn: "AS13335 Cloudflare", org: "REDFORGE Corp." },
      techFingerprint: ['React', 'Cloudflare CDN', 'Nginx 1.25'],
      openPorts: [80, 443]
    },
    {
      id: 'node-api',
      name: 'Production API Endpoint',
      type: 'Subdomain',
      address: 'api.prod.reforge.io',
      connectedTo: 'node-root',
      dnsRecords: ['A 13.244.11.90', 'CNAME aws-elb-api-prod-9831.amazonaws.com'],
      sslCert: { issuer: "DigiCert TLS RSA SHA256", validTo: "2027-01-20", strength: "RSA 2048-bit" },
      whois: { registrar: "Amazon Registrar", asn: "AS16509 AWS", org: "REDFORGE Corp." },
      headers: {
        'Server': 'Nginx/1.22.1',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      },
      techFingerprint: ['Express.js', 'Node.js', 'Kubernetes Ingress'],
      openPorts: [443, 8080]
    },
    {
      id: 'node-auth',
      name: 'Authentication Portal',
      type: 'Subdomain',
      address: 'portal.auth.internal',
      connectedTo: 'node-root',
      dnsRecords: ['A 10.240.5.12'],
      sslCert: { issuer: "REDFORGE Internal CA", validTo: "2028-05-01", strength: "RSA 4099-bit" },
      whois: { registrar: "Internal Registration", asn: "AS0 Private Subnet", org: "REDFORGE Corp." },
      headers: {
        'Server': 'Keycloak Identity Server',
        'Content-Security-Policy': "default-src 'self'"
      },
      techFingerprint: ['Keycloak 24.1', 'WildFly', 'PostgreSQL'],
      openPorts: [80, 443, 8443]
    },
    {
      id: 'node-db',
      name: 'Internal Database Cluster',
      type: 'IP',
      address: '10.240.12.83',
      connectedTo: 'node-auth',
      dnsRecords: ['None (Internal IP)'],
      sslCert: { issuer: "REDFORGE Internal CA", validTo: "2028-05-01", strength: "RSA 4099-bit" },
      whois: { registrar: "Internal Registry", asn: "AS0 Private Subnet", org: "REDFORGE Corp." },
      techFingerprint: ['PostgreSQL 16.2 Cluster', 'PgBouncer'],
      openPorts: [5432, 6432]
    },
    {
      id: 'node-storage',
      name: 'Customer Storage S3 Bucket',
      type: 'IP',
      address: 's3://rf-customer-data-01',
      connectedTo: 'node-api',
      dnsRecords: ['None (S3 Protocol)'],
      whois: { registrar: "Amazon Web Services", asn: "AS16509 AWS", org: "AWS S3 Svc" },
      techFingerprint: ['AWS S3 API', 'IAM Policy Enforcement'],
      openPorts: [443]
    }
  ]);

  const selectedNode = discoveryNodes.find(n => n.id === selectedNodeId) || discoveryNodes[0];

  const handleTriggerDiscovery = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanLogs(['[DISCOVERY] Initializing continuous crawler engine...']);

    const logSteps = [
      { t: 300, msg: '[DNS] Crawling WHOIS registries and zone records for domain reforge.io...' },
      { t: 700, msg: '[SSL] Querying certificate transparency ledger for subdomains...' },
      { t: 1100, msg: '[PORT] Found open ports [443, 8080] on api.prod.reforge.io.' },
      { t: 1500, msg: '[FINGERPRINT] Fingerprinted service: Nginx 1.22.1, Keycloak Auth Engine.' },
      { t: 1900, msg: '[COMPLETED] Discovered 5 primary active attack surface vectors.' }
    ];

    logSteps.forEach(step => {
      setTimeout(() => {
        setScanLogs(prev => [...prev, step.msg]);
        setScanProgress(p => Math.min(p + 20, 100));
      }, step.t);
    });

    setTimeout(() => {
      setIsScanning(false);
      setScanProgress(100);
      
      // Automatically add one newly discovered node to our state!
      const randomID = `node-new-${Math.floor(Math.random() * 900 + 100)}`;
      const newNode: DiscoveryNode = {
        id: randomID,
        name: 'Discovered CI/CD Jenkins Runner',
        type: 'Subdomain',
        address: 'jenkins-ci.stage.reforge.io',
        connectedTo: 'node-root',
        dnsRecords: ['A 13.244.11.199'],
        sslCert: { issuer: "Let's Encrypt", validTo: "2026-11-01", strength: "ECDSA 256" },
        whois: { registrar: "Amazon Registrar", asn: "AS16509 AWS", org: "Jenkins automation" },
        techFingerprint: ['Jenkins CI', 'Java VM 17', 'Docker Node'],
        openPorts: [8080]
      };

      setDiscoveryNodes(prev => {
        if (!prev.some(n => n.address === newNode.address)) {
          return [...prev, newNode];
        }
        return prev;
      });

      // Add as asset!
      onAddAsset({
        type: 'Server',
        name: newNode.name,
        address: newNode.address,
        criticality: 'High',
        environment: 'Staging',
        tags: ['ci-cd', 'auto-discovered'],
        status: 'Active'
      });

    }, 2200);
  };

  return (
    <div className="space-y-6" id="attack-surface-discovery-container">
      <div className="rounded-2xl border border-[#2f3a4a] bg-[linear-gradient(135deg,rgba(22,27,34,0.96),rgba(13,17,23,0.96))] p-5 shadow-[0_20px_45px_rgba(2,6,23,0.35)]" id="discovery-header">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-red-400">
              <Network className="h-3.5 w-3.5 animate-pulse" />
              <span>ASM Autonomous Crawler</span>
            </div>
            <h2 className="text-lg font-semibold text-white font-display">Surface Discovery Command Center</h2>
            <p className="text-sm leading-6 text-[#8b949e]">Passive OSINT, WHOIS lookups, DNS zone mapping, and certificate registry inspection in a single enterprise-grade control surface.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            {isScanning ? (
              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-mono font-semibold text-red-400 sm:w-auto">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Mapping Network: {scanProgress}%</span>
                </span>
              </div>
            ) : (
              <button
                onClick={handleTriggerDiscovery}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_18px_rgba(225,29,72,0.28)] transition-all hover:bg-red-700 sm:w-auto"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Crawl External Perimeter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_360px]" id="discovery-body">
        <div className="relative flex flex-col rounded-2xl border border-[#2f3a4a] bg-[linear-gradient(135deg,rgba(22,27,34,0.98),rgba(13,17,23,0.98))] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.35)]" id="discovery-graph-panel">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white font-display">Target Network Mesh</h3>
              <p className="mt-1 text-[11px] leading-5 text-[#8b949e]">Click any node to inspect the exposed services, trust chain, and ownership metadata.</p>
            </div>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-red-400">
              {discoveryNodes.length} Node Labels
            </span>
          </div>

          <div className="relative mt-2 min-h-[520px] rounded-2xl border border-[#30363d] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.14),transparent_36%),linear-gradient(135deg,#0d1117,#161b22)] p-3" id="discovery-svg-wrapper">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.16),transparent_34%)]" />
            <svg viewBox="0 0 700 620" className="relative z-10 h-full w-full" id="discovery-mesh-svg">
              {discoveryNodes.map((node) => {
                if (!node.connectedTo) return null;
                const parent = discoveryNodes.find(n => n.id === node.connectedTo);
                if (!parent) return null;

                const parentIdx = discoveryNodes.findIndex(n => n.id === parent.id);
                const nodeIdx = discoveryNodes.findIndex(n => n.id === node.id);

                const getCoordinates = (idx: number) => {
                  const xPositions = [350, 140, 530, 150, 530, 340];
                  const yPositions = [90, 220, 220, 400, 400, 560];
                  return {
                    x: xPositions[idx % xPositions.length],
                    y: yPositions[idx % yPositions.length]
                  };
                };

                const start = getCoordinates(parentIdx);
                const end = getCoordinates(nodeIdx);

                return (
                  <line
                    key={`line-${node.id}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={selectedNodeId === node.id || selectedNodeId === parent.id ? '#2563eb' : '#30363d'}
                    strokeWidth={selectedNodeId === node.id || selectedNodeId === parent.id ? '2.2' : '1.2'}
                    strokeDasharray={node.type === 'IP' ? '6,6' : '0'}
                    className="transition-all duration-300"
                  />
                );
              })}

              {discoveryNodes.map((node, idx) => {
                const xPositions = [350, 140, 530, 150, 530, 340];
                const yPositions = [90, 220, 220, 400, 400, 560];
                const x = xPositions[idx % xPositions.length];
                const y = yPositions[idx % yPositions.length];

                const isSelected = selectedNodeId === node.id;
                const nodeColor = node.type === 'Domain' ? '#ef4444' : node.type === 'Subdomain' ? '#3b82f6' : '#10b981';

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer group"
                  >
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="20"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        className="animate-ping"
                      />
                    )}

                    <circle
                      cx={x}
                      cy={y}
                      r="13"
                      fill="#161B22"
                      stroke={isSelected ? '#3b82f6' : '#30363d'}
                      strokeWidth="2"
                      className="transition-all duration-300 group-hover:stroke-blue-500"
                    />

                    <circle
                      cx={x}
                      cy={y}
                      r="5.5"
                      fill={nodeColor}
                    />

                    <text
                      x={x}
                      y={y + 28}
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : '#8b949e'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="select-none transition-all duration-300 group-hover:fill-white"
                    >
                      {node.address}
                    </text>
                  </g>
                );
              })}
            </svg>

            {scanLogs.length > 0 && (
              <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-[#30363d]/80 bg-[#0d1117]/90 p-3 shadow-2xl backdrop-blur-sm" id="discovery-scan-console">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">Live Scan Feed</span>
                  <span className="text-[9px] font-mono text-red-400">{scanProgress}%</span>
                </div>
                <div className="max-h-[120px] space-y-1 overflow-y-auto pr-1 font-mono text-[9px] text-[#8b949e]">
                  {scanLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-md bg-[#161B22]/80 px-2 py-1.5">
                      <span className="mt-0.5 text-red-500">#</span>
                      <span className="text-white">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-[#2f3a4a] bg-[linear-gradient(180deg,rgba(22,27,34,0.98),rgba(13,17,23,0.98))] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.35)]" id="discovery-inspector-panel">
          <div className="rounded-2xl border border-[#2b3646] bg-[#0d1117]/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-blue-400">
                  Node Inspector
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white font-display">{selectedNode.name}</h3>
                <p className="mt-1 text-sm font-mono text-blue-400">{selectedNode.address}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
                <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-400">Status</div>
                <div className="mt-1 text-sm font-semibold text-emerald-300">Live</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#21262d] px-2.5 py-1 text-[10px] text-[#8b949e]">Telemetry active</span>
              <span className="rounded-full bg-[#21262d] px-2.5 py-1 text-[10px] text-[#8b949e]">{selectedNode.openPorts?.length ?? 0} exposed services</span>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">Asset Type</div>
                <div className="font-semibold text-white">{selectedNode.type}</div>
              </div>
              <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">Open Ports</div>
                <div className="font-mono font-semibold text-red-400">{selectedNode.openPorts ? selectedNode.openPorts.join(', ') : 'None'}</div>
              </div>
            </div>

            {selectedNode.dnsRecords && (
              <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">DNS Zone Records</div>
                <div className="space-y-1 font-mono text-[10px] text-white">
                  {selectedNode.dnsRecords.map((rec, i) => (
                    <div key={i}>{rec}</div>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.sslCert && (
              <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">
                  <Lock className="h-3 w-3 text-green-500" />
                  <span>TLS/SSL Certificate</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#8b949e]">Issuer</span>
                    <span className="max-w-[150px] truncate text-right font-medium text-white">{selectedNode.sslCert.issuer}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#8b949e]">Valid To</span>
                    <span className="font-mono text-white">{selectedNode.sslCert.validTo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#8b949e]">Cipher</span>
                    <span className="font-mono text-green-400">{selectedNode.sslCert.strength}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.whois && (
              <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">WHOIS Registry Mapping</div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#8b949e]">Registrar</span>
                    <span className="max-w-[150px] text-right text-white">{selectedNode.whois.registrar}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#8b949e]">ASN Group</span>
                    <span className="max-w-[150px] text-right font-mono text-blue-400">{selectedNode.whois.asn}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#8b949e]">Org Owner</span>
                    <span className="max-w-[150px] text-right font-medium text-white">{selectedNode.whois.org}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.techFingerprint && (
              <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b949e]">Technology Fingerprints</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.techFingerprint.map((tech, i) => (
                    <span key={i} className="rounded-full bg-[#30363d] px-2.5 py-1 text-[10px] font-mono text-white">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
