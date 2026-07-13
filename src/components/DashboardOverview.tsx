import React, { useState } from 'react';
import { Finding, Asset, AuditLog } from '../types';
import { 
  Play, ShieldAlert, CheckCircle, Activity, Globe, RefreshCw, 
  Terminal, Layers, TrendingUp, AlertTriangle, Search, Clipboard, 
  Plus, ArrowUpRight, Folder, FileText, Bell, Zap, FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardOverviewProps {
  findings: Finding[];
  assets: Asset[];
  logs: AuditLog[];
  projectsCount: number;
  assessmentsCount: number;
  reportsCount: number;
  onInitiateScan: () => void;
  isScanning: boolean;
  scanProgress: number;
  onQuickAction: (action: string) => void;
  onSearchQuery: (query: string) => void;
}

export default function DashboardOverview({
  findings,
  assets,
  logs,
  projectsCount,
  assessmentsCount,
  reportsCount,
  onInitiateScan,
  isScanning,
  scanProgress,
  onQuickAction,
  onSearchQuery
}: DashboardOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Finding status & severity breakdowns
  const criticalCount = findings.filter(f => f.severity === 'Critical').length;
  const highCount = findings.filter(f => f.severity === 'High').length;
  const mediumCount = findings.filter(f => f.severity === 'Medium').length;
  const lowCount = findings.filter(f => f.severity === 'Low' || !f.severity).length;

  const openCount = findings.filter(f => f.status !== 'Resolved' && f.status !== 'Closed').length;
  const closedCount = findings.filter(f => f.status === 'Resolved' || f.status === 'Closed').length;

  // Threat Exposure Score algorithm
  const baseExposure = (criticalCount * 22 + highCount * 14 + mediumCount * 6 + lowCount * 2);
  const exposureScore = Math.min(Math.max(Math.round(baseExposure), 10), 100);

  const getRiskLabel = (score: number) => {
    if (score >= 70) return { label: 'CRITICAL', color: 'text-red-500' };
    if (score >= 40) return { label: 'ELEVATED', color: 'text-orange-400' };
    return { label: 'LOW RISK', color: 'text-green-400' };
  };

  const riskMeta = getRiskLabel(exposureScore);

  // Recharts structured data
  const trendData = [
    { name: 'Mon', Critical: 2, High: 3, Medium: 4 },
    { name: 'Tue', Critical: 2, High: 3, Medium: 5 },
    { name: 'Wed', Critical: 3, High: 4, Medium: 4 },
    { name: 'Thu', Critical: 2, High: 4, Medium: 5 },
    { name: 'Fri', Critical: 3, High: 4, Medium: 6 },
    { name: 'Sat', Critical: 4, High: 5, Medium: 5 },
    { name: 'Sun', Critical: criticalCount, High: highCount, Medium: mediumCount }
  ];

  const severityPieData = [
    { name: 'Critical', value: criticalCount || 1, color: '#ef4444' },
    { name: 'High', value: highCount || 2, color: '#f97316' },
    { name: 'Medium', value: mediumCount || 1, color: '#eab308' },
    { name: 'Low', value: lowCount || 1, color: '#3b82f6' }
  ];

  const cvssDistributionData = [
    { range: '9.0 - 10', count: findings.filter(f => f.cvss >= 9.0).length },
    { range: '7.0 - 8.9', count: findings.filter(f => f.cvss >= 7.0 && f.cvss < 9.0).length },
    { range: '4.0 - 6.9', count: findings.filter(f => f.cvss >= 4.0 && f.cvss < 7.0).length },
    { range: '0.1 - 3.9', count: findings.filter(f => f.cvss > 0 && f.cvss < 4.0).length }
  ];

  const mitreCoverage = [
    { tech: 'T1190 Exploit Apps', count: findings.filter(f => f.mitreAttack.includes('T1190')).length || 2, max: 4 },
    { tech: 'T1539 Session Cookie', count: findings.filter(f => f.mitreAttack.includes('T1539')).length || 1, max: 4 },
    { tech: 'T1530 Cloud Object', count: findings.filter(f => f.mitreAttack.includes('T1530')).length || 1, max: 4 },
    { tech: 'T1078 Valid Accounts', count: findings.filter(f => f.mitreAttack.includes('T1078')).length || 1, max: 4 }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQuery(searchTerm);
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="dashboard-container">
      
      {/* Global Search & Quick Actions Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161B22] p-4 rounded-xl border border-[#30363d]" id="dashboard-search-bar">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search assets, findings, logs or reports..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearchQuery(e.target.value);
            }}
            className="w-full bg-[#0d1117] text-xs text-[#e6edf3] pl-9 pr-4 py-2 border border-[#30363d] rounded-lg focus:outline-none focus:border-blue-500 placeholder-[#8b949e]"
          />
          <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-2.5" />
        </form>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto" id="dashboard-quick-actions">
          <button
            onClick={() => onQuickAction('add-asset')}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Asset</span>
          </button>
          <button
            onClick={() => onQuickAction('import-assets')}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => onQuickAction('generate-report')}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Crawl Engine Banner */}
      {isScanning && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-4 flex items-center justify-between" id="dashboard-scan-banner">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-white">Continuous Attack Surface Crawler Active</h4>
              <p className="text-xs text-[#8b949e]">Scanning subdomains, active IP nodes, and exposed S3 buckets...</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-48">
            <div className="h-2 w-full bg-[#30363d] rounded-full overflow-hidden">
              <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
            </div>
            <span className="text-xs font-mono font-bold text-red-500">{scanProgress}%</span>
          </div>
        </div>
      )}

      {/* Enterprise KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-metrics">
        
        {/* Exposure Meter */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] shadow-sm relative overflow-hidden flex flex-col justify-between h-36" id="metric-threat-exposure">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider">Perimeter Risk Score</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${exposureScore >= 60 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {riskMeta.label}
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-bold font-display text-white">{exposureScore}</span>
              <span className="text-xs text-[#8b949e]">/ 100 max</span>
            </div>
          </div>
          <div className="w-full bg-[#30363d] h-2 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${exposureScore}%` }}></div>
          </div>
          <ShieldAlert className="w-12 h-12 text-red-600 absolute right-3 top-4 opacity-10" />
        </div>

        {/* Core Findings Counter */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] shadow-sm relative overflow-hidden flex flex-col justify-between h-36" id="metric-active-vulnerabilities">
          <div>
            <span className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider block">Vulnerability Ledger</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-bold font-display text-white">{openCount}</span>
              <span className="text-xs text-[#8b949e]">active / {closedCount} resolved</span>
            </div>
          </div>
          <div className="flex gap-2 text-[10px] font-mono mt-2">
            <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/15">C: {criticalCount}</span>
            <span className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/15">H: {highCount}</span>
            <span className="text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/15">M: {mediumCount}</span>
          </div>
          <Layers className="w-12 h-12 text-blue-500 absolute right-3 top-4 opacity-10" />
        </div>

        {/* Monitored Assets Cover */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] shadow-sm relative overflow-hidden flex flex-col justify-between h-36" id="metric-monitored-assets">
          <div>
            <span className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider block">Monitored Assets</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-bold font-display text-white">{assets.length}</span>
              <span className="text-xs text-green-400 font-semibold flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Live Nodes
              </span>
            </div>
          </div>
          <div className="text-[10px] text-[#8b949e] font-mono">
            {assets.filter(a => a.type === 'Domain' || a.type === 'Subdomain').length} Domains / {assets.filter(a => a.type === 'IP').length} IPs / {assets.filter(a => a.type === 'Cloud').length} Cloud
          </div>
          <Globe className="w-12 h-12 text-green-500 absolute right-3 top-4 opacity-10" />
        </div>

        {/* Workspaces & Assessments Metrics */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] shadow-sm relative overflow-hidden flex flex-col justify-between h-36" id="metric-platform-control">
          <div>
            <span className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider block font-display">SaaS Control Center</span>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
                <div className="text-[14px] font-bold text-white">{projectsCount}</div>
                <div className="text-[8px] text-[#8b949e] uppercase font-bold">Projects</div>
              </div>
              <div className="bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
                <div className="text-[14px] font-bold text-white">{assessmentsCount}</div>
                <div className="text-[8px] text-[#8b949e] uppercase font-bold">Scans</div>
              </div>
              <div className="bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
                <div className="text-[14px] font-bold text-white">{reportsCount}</div>
                <div className="text-[8px] text-[#8b949e] uppercase font-bold">Reports</div>
              </div>
            </div>
          </div>
          <button
            onClick={onInitiateScan}
            disabled={isScanning}
            className={`w-full py-1.5 rounded-lg flex items-center justify-center space-x-1.5 text-[11px] font-bold transition-all cursor-pointer ${
              isScanning
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>{isScanning ? 'Scan Running' : 'Trigger ASM Scan'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
        
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#161B22] p-5 rounded-xl border border-[#30363d]" id="chart-vulnerability-trend">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Weekly Exposure Crawl Trend</h3>
              <p className="text-[10px] text-[#8b949e]">Distribution of newly mapped open vulnerabilities over time.</p>
            </div>
            <span className="text-[9px] text-[#8b949e] font-mono flex items-center bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
              <TrendingUp className="w-3 h-3 mr-1 text-blue-500" />
              WEEK-OVER-WEEK
            </span>
          </div>
          
          <div className="h-56" id="trend-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="name" stroke="#8b949e" fontSize={10} tickLine={false} />
                <YAxis stroke="#8b949e" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', fontSize: '11px', color: '#fff' }} />
                <Area type="monotone" dataKey="Critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} />
                <Area type="monotone" dataKey="High" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Pie Chart */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d]" id="chart-severity-pie">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Severity Distribution</h3>
          <div className="h-44 flex justify-center items-center" id="pie-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-3 text-center" id="pie-legend">
            <div className="flex items-center justify-center space-x-1 bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-white">Crit ({criticalCount})</span>
            </div>
            <div className="flex items-center justify-center space-x-1 bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
              <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              <span className="text-white">High ({highCount})</span>
            </div>
            <div className="flex items-center justify-center space-x-1 bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
              <span className="w-2 h-2 rounded-full bg-[#eab308]" />
              <span className="text-white">Med ({mediumCount})</span>
            </div>
            <div className="flex items-center justify-center space-x-1 bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-white">Low ({lowCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Framework Coverages: CVSS, MITRE ATT&CK & OWASP Top 10 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs" id="dashboard-frameworks">
        
        {/* CVSS Distribution Bar Chart */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] flex flex-col justify-between" id="chart-cvss-distribution">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-display">CVSS Distribution</h3>
          <div className="h-44" id="cvss-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cvssDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="range" stroke="#8b949e" fontSize={9} />
                <YAxis stroke="#8b949e" fontSize={9} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MITRE ATT&CK Coverage */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] space-y-3" id="mitre-coverage-list">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">MITRE ATT&CK Mapping</h3>
            <span className="text-[9px] bg-blue-600/15 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">TTP COVER</span>
          </div>
          <div className="space-y-3">
            {mitreCoverage.map((mitre, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#e6edf3]">
                  <span>{mitre.tech}</span>
                  <span className="text-blue-400 font-bold">{mitre.count} vulnerabilities</span>
                </div>
                <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden border border-[#30363d]">
                  <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(mitre.count / mitre.max) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OWASP Top 10 Coverage */}
        <div className="bg-[#161B22] p-5 rounded-xl border border-[#30363d] space-y-3" id="owasp-coverage-list">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">OWASP Top 10 Exposure</h3>
            <span className="text-[9px] bg-red-600/15 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">VECTORS</span>
          </div>
          <div className="space-y-2 text-[10px]">
            <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
              <span className="text-red-400 font-bold">A01 Broken Access Control</span>
              <span className="text-white font-bold bg-red-500/10 px-1.5 py-0.5 rounded">HIGH (2)</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
              <span className="text-orange-400 font-bold">A03 Injection (SQLi/XSS)</span>
              <span className="text-white font-bold bg-orange-500/10 px-1.5 py-0.5 rounded">HIGH (2)</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
              <span className="text-yellow-400 font-bold">A05 Security Misconfiguration</span>
              <span className="text-white font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">MED (1)</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
              <span className="text-red-500 font-bold">A08 Software Integrity Failures</span>
              <span className="text-white font-bold bg-red-500/10 px-1.5 py-0.5 rounded">CRIT (1)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Section: High-Criticality Findings Table + Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-mid-sections">
        {/* Table of High-Criticality Findings */}
        <div className="lg:col-span-2 bg-[#161B22] border border-[#30363d] rounded-xl flex flex-col overflow-hidden shadow-sm" id="dashboard-findings-panel">
          <div className="px-6 py-4 border-b border-[#30363d] flex justify-between items-center" id="dashboard-findings-header">
            <h3 className="text-sm font-bold text-white font-display">Active Critical Exposure Ledger</h3>
            <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase font-mono">
              PERIMETER EXPLOITATION VECTOR
            </span>
          </div>
          <div className="flex-1 overflow-x-auto" id="dashboard-table-wrapper">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0d1117] text-[#8b949e] text-[10px] uppercase tracking-widest font-mono">
                <tr className="border-b border-[#30363d]">
                  <th className="px-6 py-3.5 font-semibold">Identifier</th>
                  <th className="px-6 py-3.5 font-semibold">Vulnerability Title</th>
                  <th className="px-6 py-3.5 font-semibold">Severity</th>
                  <th className="px-6 py-3.5 font-semibold">Target Asset</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#30363d]" id="dashboard-table-body">
                {findings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#8b949e] text-xs">
                      No active threat exposures recorded matching search queries.
                    </td>
                  </tr>
                ) : (
                  findings.slice(0, 4).map((f) => (
                    <tr key={f.id} className="hover:bg-[#21262d]/40 transition-colors">
                      <td className={`px-6 py-4 font-mono text-[11px] font-bold ${
                        f.severity === 'Critical' ? 'text-red-400' : 'text-orange-400'
                      }`}>
                        {f.identifier}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#e6edf3]">
                        {f.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          f.severity === 'Critical'
                            ? 'bg-red-500/20 text-red-500 border-red-500/30'
                            : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        }`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#8b949e] font-mono text-xs max-w-xs truncate">
                        {f.asset}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            f.status === 'Open'
                              ? 'bg-red-500 animate-pulse'
                              : f.status === 'In Triage'
                              ? 'bg-yellow-500 animate-pulse'
                              : f.status === 'Assigned'
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                          }`}></span>
                          <span className="text-xs text-[#e6edf3] font-mono uppercase text-[10px]">{f.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Telemetry Log Panel */}
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col space-y-6 shadow-sm" id="dashboard-side-panel">
          <div id="mini-audit-log-section">
            <h3 className="text-xs font-bold text-white mb-3 font-display uppercase tracking-wider">Telemetry Logs</h3>
            <div className="space-y-3.5" id="mini-audit-log-list">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start space-x-3 text-xs border-b border-[#30363d]/40 pb-2.5 last:border-b-0" id={`mini-log-${log.id}`}>
                  <div className={`w-1 h-8 rounded-full mt-1 ${
                    log.severity === 'Critical' ? 'bg-red-500' : log.severity === 'Warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#8b949e] font-semibold">
                        {new Date(log.timestamp).toLocaleTimeString()} UTC
                      </span>
                      <span className="text-[9px] text-blue-400 font-mono font-semibold">{log.user.split('@')[0]}</span>
                    </div>
                    <div className="text-[11px] text-[#e6edf3] font-medium leading-tight mt-1">{log.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
