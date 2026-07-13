import React, { useState } from 'react';
import { AuditLog, User, UserRole } from '../types';
import { 
  ShieldCheck, Users, Radio, Cpu, Activity, Shield, Terminal, Key, Clock, Server,
  Plus, Mail, Building, CreditCard, RefreshCw, Sliders, Check, Trash, Edit, Layers
} from 'lucide-react';
import { API } from '../lib/api';

interface LogsAndSettingsProps {
  logs: AuditLog[];
  users: User[];
  onUpdateUserRole: (id: string, newRole: UserRole) => void;
  onUpdateUserStatus: (id: string, status: 'Active' | 'Suspended') => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
}

export default function LogsAndSettings({
  logs,
  users,
  onUpdateUserRole,
  onUpdateUserStatus,
  onAddUser
}: LogsAndSettingsProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'settings' | 'tenants'>('logs');
  const [rbacEnabled, setRbacEnabled] = useState(true);
  const [immutableLock, setImmutableLock] = useState(true);
  const [scanInterval, setScanInterval] = useState('24h');
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // Tenants Data States (Organizations & Teams)
  const [organizationsList, setOrganizationsList] = useState<any[]>([]);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Org form state
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgFormName, setOrgFormName] = useState('');
  const [orgFormDomain, setOrgFormDomain] = useState('');
  const [orgFormTier, setOrgFormTier] = useState('Platinum');
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);

  // Team form state
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormDesc, setTeamFormDesc] = useState('');
  const [teamFormOrgId, setTeamFormOrgId] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const loadTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const orgs = await API.organizations.getAll();
      const tms = await API.teams.getAll();
      setOrganizationsList(orgs);
      setTeamsList(tms);
    } catch (err) {
      console.error('Failed to load tenants data:', err);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  React.useEffect(() => {
    loadTenants();
  }, []);

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgFormName.trim()) return;
    try {
      if (editingOrgId) {
        await API.organizations.update(editingOrgId, {
          name: orgFormName.trim(),
          domain: orgFormDomain.trim(),
          subscriptionTier: orgFormTier
        });
      } else {
        await API.organizations.create({
          name: orgFormName.trim(),
          domain: orgFormDomain.trim(),
          subscriptionTier: orgFormTier
        });
      }
      setOrgFormName('');
      setOrgFormDomain('');
      setOrgFormTier('Platinum');
      setEditingOrgId(null);
      setShowOrgForm(false);
      await loadTenants();
    } catch (err) {
      alert('Failed to save organization details.');
    }
  };

  const handleEditOrg = (org: any) => {
    setEditingOrgId(org.id);
    setOrgFormName(org.name);
    setOrgFormDomain(org.domain);
    setOrgFormTier(org.subscriptionTier || 'Platinum');
    setShowOrgForm(true);
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? Teams associated with it will remain but without an active parent org mapping.')) return;
    try {
      await API.organizations.delete(id);
      await loadTenants();
    } catch (err) {
      alert('Failed to delete organization.');
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormName.trim()) return;
    try {
      if (editingTeamId) {
        await API.teams.update(editingTeamId, {
          name: teamFormName.trim(),
          description: teamFormDesc.trim()
        });
      } else {
        await API.teams.create({
          organizationId: teamFormOrgId ? teamFormOrgId : null,
          name: teamFormName.trim(),
          description: teamFormDesc.trim()
        });
      }
      setTeamFormName('');
      setTeamFormDesc('');
      setTeamFormOrgId('');
      setEditingTeamId(null);
      setShowTeamForm(false);
      await loadTenants();
    } catch (err) {
      alert('Failed to save team details.');
    }
  };

  const handleEditTeam = (team: any) => {
    setEditingTeamId(team.id);
    setTeamFormName(team.name);
    setTeamFormDesc(team.description);
    setTeamFormOrgId(team.organizationId || '');
    setShowTeamForm(true);
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await API.teams.delete(id);
      await loadTenants();
    } catch (err) {
      alert('Failed to delete team.');
    }
  };

  // User Invitation state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Security Analyst');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [lastGeneratedInvite, setLastGeneratedInvite] = useState('');

  // Branding, SMTP & Licensing settings state
  const [orgName, setOrgName] = useState('REDFORGE Cyber Corp');
  const [brandingColor, setBrandingColor] = useState('#E11D48');
  const [smtpServer, setSmtpServer] = useState('smtp-relay.redforge.io');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpStatus, setSmtpStatus] = useState<'CONNECTED' | 'UNCONFIGURED'>('CONNECTED');
  const [licenseKey] = useState('RF-PLATINUM-84K92-D8492-49KD2');

  // Real API credential state
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key: string; created: string }>>([
    { id: 'key-1', name: 'Continuous Pipeline Scraper Bot', key: 'rf_live_72k4921f90a2e1d842c90a192bc03810ff42', created: '2026-05-12' },
    { id: 'key-2', name: 'Enterprise SIEM (Splunk Feed)', key: 'rf_live_d8439acb39a8e2d23fba9310de43029bcda9', created: '2026-06-01' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [justGeneratedKey, setJustGeneratedKey] = useState('');

  const handleGenerateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const genKey = `rf_live_${randomHex}`;
    
    const newEntry = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      key: genKey,
      created: new Date().toISOString().split('T')[0]
    };
    
    setApiKeys(prev => [...prev, newEntry]);
    setJustGeneratedKey(genKey);
    setNewKeyName('');
    
    setTimeout(() => {
      setJustGeneratedKey('');
    }, 10000); // clear visual green banner after 10s
  };

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      alert('Security violation: operator name and email are mandatory parameters.');
      return;
    }
    
    // Call the context-backed user creation
    onAddUser({
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      status: 'Active',
      avatar: inviteName.substring(0, 2).toUpperCase()
    });
    
    const randomToken = Math.floor(Math.random() * 900000 + 100000);
    const inviteUrl = `https://redforge.io/auth/onboard?token=rf_tkn_${randomToken}&email=${encodeURIComponent(inviteEmail)}`;
    
    setLastGeneratedInvite(inviteUrl);
    setInviteName('');
    setInviteEmail('');
  };

  const handleDispatchDiagnostic = () => {
    setIsDiagnosing(true);
    setDiagnosticLogs(['[INIT] Initializing cryptographic diagnostic probe...']);
    
    setTimeout(() => {
      setDiagnosticLogs(prev => [...prev, '[ROUTE] Mapping route packet gateway to remote core 10.240.12.83...']);
    }, 600);
    
    setTimeout(() => {
      setDiagnosticLogs(prev => [...prev, '[ICMP] ICMP EchoRequest dispatched. Packet size 64 bytes.']);
    }, 1200);

    setTimeout(() => {
      setDiagnosticLogs(prev => [...prev, '[SUCCESS] Roundtrip completed in 4.12ms. Scan agent status: nominal.']);
      setIsDiagnosing(false);
    }, 1800);
  };

  const getLogSeverityStyle = (sev: 'Info' | 'Warning' | 'Critical') => {
    switch (sev) {
      case 'Critical':
        return 'text-red-500 font-bold';
      case 'Warning':
        return 'text-yellow-500 font-bold';
      case 'Info':
        return 'text-blue-400';
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="logs-settings-panel">
      {/* Tab Selectors */}
      <div className="flex border-b border-[#30363d] pb-px" id="logs-settings-tabs">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-red-600 text-white'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Immutable Audit Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-red-600 text-white'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User &amp; Role Provisioning (RBAC)</span>
        </button>
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'tenants'
              ? 'border-red-600 text-white'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Organizations &amp; Teams</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'border-red-600 text-white'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Platform Controls</span>
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm" id="audit-logs-card">
          <div className="p-5 border-b border-[#30363d] flex justify-between items-center bg-[#0d1117]/50">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Enterprise Telemetry Streams</h3>
              <p className="text-[11px] text-[#8b949e] mt-1">Immutable record of every authorization grant, scanner heartbeat, and findings modification event.</p>
            </div>
            {immutableLock && (
              <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded font-mono text-[9px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <span>CRYPTOGRAPHICALLY LOCKED</span>
              </span>
            )}
          </div>
          <div className="overflow-x-auto" id="audit-logs-table-wrapper">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0d1117] text-[#8b949e] uppercase tracking-widest text-[9px]">
                <tr className="border-b border-[#30363d]">
                  <th className="px-6 py-3 font-semibold">Timestamp (UTC)</th>
                  <th className="px-6 py-3 font-semibold">Operator Principal</th>
                  <th className="px-6 py-3 font-semibold">Security Action Event</th>
                  <th className="px-6 py-3 font-semibold">IP Origin</th>
                  <th className="px-6 py-3 font-semibold">User Agent Signature</th>
                  <th className="px-6 py-3 font-semibold">Audit Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] text-[#e6edf3] font-mono text-[11px]" id="audit-logs-table-body">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#21262d]/40 transition-colors" id={`log-row-${log.id}`}>
                    <td className="px-6 py-3.5 text-[#8b949e] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-white">
                      {log.user}
                    </td>
                    <td className="px-6 py-3.5 font-sans font-medium text-[#e6edf3]">
                      {log.action}
                    </td>
                    <td className="px-6 py-3.5 text-[#8b949e]">
                      {log.ip}
                    </td>
                    <td className="px-6 py-3.5 text-[#8b949e] max-w-[150px] truncate" title={log.browser}>
                      {log.browser}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={getLogSeverityStyle(log.severity)}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: User RBAC */}
      {activeTab === 'users' && (
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm" id="user-rbac-card">
          <div className="p-5 border-b border-[#30363d] bg-[#0d1117]/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Active Directory &amp; RBAC Control Panel</h3>
              <p className="text-[11px] text-[#8b949e] mt-1">Manage active platform operators, configure security privileges, and override active session profiles.</p>
            </div>
            <button
              onClick={() => {
                setShowInviteForm(!showInviteForm);
                setLastGeneratedInvite('');
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.3)] self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showInviteForm ? 'Collapse Invite Panel' : 'Invite New Operator'}</span>
            </button>
          </div>

          {/* Collapsible Invite Form */}
          {showInviteForm && (
            <div className="p-5 border-b border-[#30363d] bg-[#0d1117]/40 space-y-4 animate-fade-in" id="operator-invite-panel">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-red-500" />
                <span>Invite Operator to Platform</span>
              </h4>
              <form onSubmit={handleSendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Operator Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="E.g. David Bowman"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Corporate Identity E-mail</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="david@reforge.io"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">RBAC Assigned Privilege</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Administrator">Administrator (All Privileges)</option>
                    <option value="Lead Pentester">Lead Pentester (Findings & Scans)</option>
                    <option value="Security Analyst">Security Analyst (Triage & Read)</option>
                    <option value="Security Manager">Security Manager (Assessments & Settings)</option>
                    <option value="Viewer">Viewer (Read-Only Access)</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Generate Cryptographic Invite</span>
                  </button>
                </div>
              </form>

              {lastGeneratedInvite && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2 text-xs animate-fade-in" id="invite-success-notification">
                  <div className="flex items-center space-x-2 text-green-400 font-bold font-mono">
                    <Check className="w-4 h-4" />
                    <span>OPERATOR PROVISIONED &amp; EMAIL DISPATCHED</span>
                  </div>
                  <p className="text-[#8b949e] leading-relaxed">
                    User has been added to the Active Directory registry. Below is the secure, cold-signed onboarding token link:
                  </p>
                  <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] font-mono text-[10px] text-white break-all select-all">
                    {lastGeneratedInvite}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto" id="user-rbac-table-wrapper">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0d1117] text-[#8b949e] uppercase tracking-widest text-[9px] border-b border-[#30363d]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Operator Info</th>
                  <th className="px-6 py-4 font-semibold">Identity Principal E-mail</th>
                  <th className="px-6 py-4 font-semibold">Assigned Security Role</th>
                  <th className="px-6 py-4 font-semibold">Privilege Scopes</th>
                  <th className="px-6 py-4 font-semibold">User Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] text-[#e6edf3]" id="user-rbac-table-body">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#21262d]/40 transition-colors" id={`user-row-${user.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-xs text-white">
                          {user.avatar}
                        </div>
                        <span className="font-bold text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[#8b949e]">{user.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)}
                        className="bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="Security Analyst">Security Analyst</option>
                        <option value="Lead Pentester">Lead Pentester</option>
                        <option value="Security Manager">Security Manager</option>
                        <option value="Blue Team Responder">Blue Team Responder</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.role === 'Administrator' ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">ALL_PRIVILEGES</span>
                        ) : user.role === 'Lead Pentester' ? (
                          <>
                            <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">WRITE_FINDINGS</span>
                            <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">TRIGGER_SCANS</span>
                          </>
                        ) : (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">READ_METRICS</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onUpdateUserStatus(user.id, user.status === 'Active' ? 'Suspended' : 'Active')}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          user.status === 'Active'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        {user.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Interactive Permission Matrix Grid */}
          <div className="p-6 border-t border-[#30363d] bg-[#0d1117]/30" id="rbac-matrix-section">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-white font-display flex items-center space-x-2">
                  <Shield className="w-4.5 h-4.5 text-red-500" />
                  <span>Enterprise RBAC Permission Enforcement Matrix</span>
                </h4>
                <p className="text-[11px] text-[#8b949e] mt-0.5">Enforcement policy mapping security roles to platform action boundaries.</p>
              </div>
              <span className="self-start px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-bold font-mono">ACTIVE CRYPTOGRAPHIC GATEWAYS</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#30363d] bg-[#0D1117]">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d] text-[10px] uppercase font-bold">
                    <th className="px-4 py-3 font-semibold text-[#e6edf3]">Platform Action Scope</th>
                    <th className="px-3 py-3 font-semibold text-center">Administrator</th>
                    <th className="px-3 py-3 font-semibold text-center">Sec Manager</th>
                    <th className="px-3 py-3 font-semibold text-center">Lead Pentester</th>
                    <th className="px-3 py-3 font-semibold text-center">Sec Analyst</th>
                    <th className="px-3 py-3 font-semibold text-center">Responder</th>
                    <th className="px-3 py-3 font-semibold text-center">Auditor / Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]/50 text-[#8b949e]">
                  <tr className="hover:bg-[#21262d]/20 transition-all">
                    <td className="px-4 py-3 text-white font-sans font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>Asset Discovery &amp; Scope Mapping</span>
                    </td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                  </tr>
                  <tr className="hover:bg-[#21262d]/20 transition-all">
                    <td className="px-4 py-3 text-white font-sans font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>Vulnerability Write &amp; Triage (CVS / EPSS)</span>
                    </td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                  </tr>
                  <tr className="hover:bg-[#21262d]/20 transition-all">
                    <td className="px-4 py-3 text-white font-sans font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>Active Port/Subnet Crawler Execution</span>
                    </td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                  </tr>
                  <tr className="hover:bg-[#21262d]/20 transition-all">
                    <td className="px-4 py-3 text-white font-sans font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>User Provisioning &amp; Role Assignments</span>
                    </td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                  </tr>
                  <tr className="hover:bg-[#21262d]/20 transition-all">
                    <td className="px-4 py-3 text-white font-sans font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>Platform Secrets &amp; Tenant Configuration</span>
                    </td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                    <td className="px-3 py-3 text-center text-[#30363d] font-bold">✗ DENIED</td>
                  </tr>
                  <tr className="hover:bg-[#21262d]/20 transition-all">
                    <td className="px-4 py-3 text-white font-sans font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>Executive Compliance Report Generation</span>
                    </td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                    <td className="px-3 py-3 text-center text-green-400 font-bold">✓ ENFORCED</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Platform Controls / Settings */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="settings-panel-grid">
          {/* Column 1: Feature Toggles & API Keyring */}
          <div className="space-y-6" id="settings-col-1">
            {/* Feature Toggles */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 shadow-sm" id="feature-toggles-card">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#30363d] pb-2.5 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-red-500" />
                <span>Feature Flag Gates</span>
              </h3>

              {/* Switch 1 */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Toggle RBAC Isolation</h4>
                  <p className="text-[10px] text-[#8b949e] mt-0.5">Enforce role-based strict path blocks.</p>
                </div>
                <button
                  onClick={() => setRbacEnabled(!rbacEnabled)}
                  className={`w-10 h-5 rounded-full transition-all relative flex items-center p-0.5 cursor-pointer ${
                    rbacEnabled ? 'bg-red-600' : 'bg-[#30363d]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    rbacEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Switch 2 */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Lock Immutable Audit</h4>
                  <p className="text-[10px] text-[#8b949e] mt-0.5">Hash and sign all ledger access.</p>
                </div>
                <button
                  onClick={() => setImmutableLock(!immutableLock)}
                  className={`w-10 h-5 rounded-full transition-all relative flex items-center p-0.5 cursor-pointer ${
                    immutableLock ? 'bg-red-600' : 'bg-[#30363d]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    immutableLock ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Frequency selection */}
              <div className="space-y-1.5 pt-2 border-t border-[#30363d]/50">
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">ASM Discovery Frequency</label>
                <select
                  value={scanInterval}
                  onChange={(e) => setScanInterval(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 font-mono"
                >
                  <option value="6h">Every 6 Hours (Fast Continuous)</option>
                  <option value="24h">Daily Automated Cron (Standard)</option>
                  <option value="7d">Weekly Assessment Sweep</option>
                </select>
              </div>
            </div>

            {/* API Key Credentials Keyring */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 shadow-sm" id="api-keyring-card">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#30363d] pb-2.5 flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>API Credentials Keyring</span>
              </h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#8b949e] font-sans">No active client keys provisioned.</div>
                ) : (
                  apiKeys.map((k) => (
                    <div key={k.id} className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-center justify-between gap-2 font-mono text-[10px]">
                      <div className="truncate">
                        <div className="text-[#e6edf3] font-bold truncate">{k.name}</div>
                        <div className="text-[#8b949e] text-[9px] mt-0.5 truncate">{k.key.substring(0, 12)}••••••••••••••••</div>
                        <div className="text-[#8b949e] text-[8px] mt-0.5">Created: {k.created}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey(k.id)}
                        className="p-1.5 text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                        title="Revoke and delete API credentials"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Generate New API Key form */}
              <form onSubmit={handleGenerateApiKey} className="space-y-2 pt-2 border-t border-[#30363d]/50">
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">New Client Key Identifier</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="E.g. GitHub Action Bot"
                    className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow-[0_0_10px_rgba(225,29,72,0.3)] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                </div>
              </form>

              {justGeneratedKey && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg space-y-1.5 text-[10px] font-mono animate-fade-in" id="api-generated-alert">
                  <div className="text-green-400 font-bold flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>KEY PROVISIONED SUCCESSFULLY</span>
                  </div>
                  <p className="text-[#8b949e] leading-relaxed text-[9px]">
                    Make sure to copy this token. You will not be able to view it again for security.
                  </p>
                  <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] text-white break-all select-all select-none">
                    {justGeneratedKey}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Organization Profile, SMTP & Licensing */}
          <div className="space-y-6" id="settings-col-2">
            {/* Org Profile & SMTP */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 shadow-sm" id="org-branding-card">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#30363d] pb-2.5 flex items-center space-x-2">
                <Building className="w-4 h-4 text-red-500" />
                <span>Tenant &amp; Brand Settings</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Corporate Operator Tenant</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Branding Primary HEX</label>
                    <div className="flex space-x-1.5 items-center">
                      <div className="w-5 h-5 rounded border border-[#30363d]" style={{ backgroundColor: brandingColor }} />
                      <input
                        type="text"
                        value={brandingColor}
                        onChange={(e) => setBrandingColor(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">SMTP Status</label>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 font-mono uppercase tracking-wider">
                      {smtpStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-[#30363d]/50 pt-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">SMTP Relay Server</label>
                    <input
                      type="text"
                      value={smtpServer}
                      onChange={(e) => setSmtpServer(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">SMTP Port</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise Licensing Status Widget */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 shadow-sm" id="corporate-licensing-card">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#30363d] pb-2.5 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span>Licensing &amp; SaaS Subscriptions</span>
              </h3>

              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8b949e] text-[10px] font-bold font-mono uppercase">Assigned Plan Tier</span>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-[4px] text-[9px] font-bold font-mono">PLATINUM ENTERPRISE</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] border-t border-[#30363d]/50 pt-2 font-mono">
                    <span className="text-[#8b949e]">Billing Recurrence</span>
                    <span className="text-white font-bold">Annual Renewal</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-[#8b949e]">License Certificate</span>
                    <span className="text-white font-bold max-w-[120px] truncate" title={licenseKey}>{licenseKey}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#8b949e]">
                    <span>LICENSED ASSET CONFINES</span>
                    <span>18.8% CAPACITY</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                    <div className="h-full bg-blue-500 w-[18.8%]" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-[#8b949e] mt-1">
                    <span>942 Nodes Active</span>
                    <span>5,000 Cap Limit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: System Health Telemetry & Diagnostics */}
          <div className="space-y-6" id="settings-col-3">
            {/* System Health */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 shadow-sm" id="system-health-card">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#30363d] pb-2.5 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span>Real-time Node Health</span>
              </h3>

              <div className="space-y-3" id="telemetry-stats">
                {/* Stat 1 */}
                <div className="flex justify-between items-center bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] text-[#8b949e]">Internal API Latency</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-green-500">14ms</span>
                </div>

                {/* Stat 2 */}
                <div className="flex justify-between items-center bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                  <div className="flex items-center space-x-2">
                    <Server className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px] text-[#8b949e]">Redis Broker Pool</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">4 / 4 Pools</span>
                </div>

                {/* Stat 3 */}
                <div className="flex justify-between items-center bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[11px] text-[#8b949e]">Target Worker Scanners</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">12 Live Nodes</span>
                </div>
              </div>
            </div>

            {/* Diagnostic Control Console */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 space-y-4 shadow-sm" id="diagnostics-card">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#30363d] pb-2.5 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-blue-500" />
                <span>Diagnostics Gateway</span>
              </h3>
              <p className="text-[11px] text-[#8b949e] leading-relaxed font-sans">
                Dispatch cryptographic packet trace request queries to continuous crawl agent subnets.
              </p>
              <button
                onClick={handleDispatchDiagnostic}
                disabled={isDiagnosing}
                className={`w-full py-2.5 text-white border text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isDiagnosing 
                    ? 'bg-blue-600/10 border-blue-500/20 text-[#8b949e]' 
                    : 'bg-[#21262d] hover:bg-[#30363d] border-[#30363d] shadow-sm'
                }`}
              >
                {isDiagnosing ? 'Dispatching Cryptographic Probe...' : 'Execute Diagnostic Trace'}
              </button>

              {diagnosticLogs.length > 0 && (
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 space-y-1.5 max-h-[140px] overflow-y-auto font-mono text-[9px] text-[#e6edf3]" id="diagnostic-console-output">
                  {diagnosticLogs.map((logLine, idx) => (
                    <div key={idx} className="leading-normal flex items-start space-x-1.5">
                      <span className="text-blue-400">#</span>
                      <span>{logLine}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Organizations and Teams CRUD */}
      {activeTab === 'tenants' && (
        <div className="space-y-6 animate-fade-in" id="tenants-view-panel">
          {isLoadingTenants ? (
            <div className="text-center py-12 text-[#8b949e] text-xs font-mono">
              <Cpu className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
              <span>Fetching secure enterprise tenant mappings...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ORGANIZATIONS CARD */}
              <div className="bg-[#161B22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-5 border-b border-[#30363d] bg-[#0d1117]/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center space-x-2">
                      <Building className="w-4.5 h-4.5 text-red-500" />
                      <span>Corporate Organizations Directory</span>
                    </h3>
                    <p className="text-[11px] text-[#8b949e] mt-1">Manage tenant perimeters, domain white-lists, and licensing tiers.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingOrgId(null);
                      setOrgFormName('');
                      setOrgFormDomain('');
                      setOrgFormTier('Platinum');
                      setShowOrgForm(!showOrgForm);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showOrgForm ? 'Cancel' : 'New Org'}</span>
                  </button>
                </div>

                {/* Org input form */}
                {showOrgForm && (
                  <form onSubmit={handleSaveOrganization} className="p-5 border-b border-[#30363d] bg-[#0d1117]/40 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {editingOrgId ? 'Modify Organization Profile' : 'Enroll New Organization'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Org Name</label>
                        <input
                          type="text"
                          required
                          value={orgFormName}
                          onChange={(e) => setOrgFormName(e.target.value)}
                          placeholder="E.g. Wayne Enterprises"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Corporate Domain</label>
                        <input
                          type="text"
                          value={orgFormDomain}
                          onChange={(e) => setOrgFormDomain(e.target.value)}
                          placeholder="E.g. wayne.com"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Subscription Tier</label>
                        <select
                          value={orgFormTier}
                          onChange={(e) => setOrgFormTier(e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="Bronze">Bronze (Staging Only)</option>
                          <option value="Silver">Silver Plan</option>
                          <option value="Gold">Gold Premium</option>
                          <option value="Platinum">Platinum Enterprise</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowOrgForm(false)}
                        className="px-3 py-1 text-xs text-[#8b949e] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                      >
                        {editingOrgId ? 'Update Org' : 'Enroll Org'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Organizations List */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0d1117] text-[#8b949e] uppercase tracking-widest text-[9px] border-b border-[#30363d]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Organization Name</th>
                        <th className="px-4 py-3 font-semibold">Verified Domain</th>
                        <th className="px-4 py-3 font-semibold">Plan Level</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
                      {organizationsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[#8b949e] italic font-sans">
                            No organizations found in the registry. Click "New Org" to enroll.
                          </td>
                        </tr>
                      ) : (
                        organizationsList.map((org) => (
                          <tr key={org.id} className="hover:bg-[#21262d]/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-white flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>{org.name}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[#8b949e]">{org.domain || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono text-[10px] font-bold">
                                {org.subscriptionTier || 'Platinum'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => handleEditOrg(org)}
                                className="p-1 text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded cursor-pointer"
                                title="Edit Organization"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrg(org.id)}
                                className="p-1 text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                                title="Delete Organization"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TEAMS CARD */}
              <div className="bg-[#161B22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-5 border-b border-[#30363d] bg-[#0d1117]/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center space-x-2">
                      <Layers className="w-4.5 h-4.5 text-red-500" />
                      <span>Security Teams Assignments</span>
                    </h3>
                    <p className="text-[11px] text-[#8b949e] mt-1">Establish dedicated pentest task forces and compliance assessment groups.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTeamId(null);
                      setTeamFormName('');
                      setTeamFormDesc('');
                      setTeamFormOrgId(organizationsList[0]?.id || '');
                      setShowTeamForm(!showTeamForm);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showTeamForm ? 'Cancel' : 'New Team'}</span>
                  </button>
                </div>

                {/* Team Input Form */}
                {showTeamForm && (
                  <form onSubmit={handleSaveTeam} className="p-5 border-b border-[#30363d] bg-[#0d1117]/40 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {editingTeamId ? 'Modify Security Team Profile' : 'Establish New Security Team'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Team Name</label>
                        <input
                          type="text"
                          required
                          value={teamFormName}
                          onChange={(e) => setTeamFormName(e.target.value)}
                          placeholder="E.g. Red Team Alpha"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Associated Tenant Org</label>
                        <select
                          value={teamFormOrgId}
                          onChange={(e) => setTeamFormOrgId(e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="">-- No Org Mapping (Standalone) --</option>
                          {organizationsList.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1">Team Purpose Description</label>
                        <input
                          type="text"
                          value={teamFormDesc}
                          onChange={(e) => setTeamFormDesc(e.target.value)}
                          placeholder="E.g. Outer boundary penetration testing"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowTeamForm(false)}
                        className="px-3 py-1 text-xs text-[#8b949e] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                      >
                        {editingTeamId ? 'Update Team' : 'Establish Team'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Teams List */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#0d1117] text-[#8b949e] uppercase tracking-widest text-[9px] border-b border-[#30363d]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Team Name</th>
                        <th className="px-4 py-3 font-semibold">Tenant Org Parent</th>
                        <th className="px-4 py-3 font-semibold">Scope/Description</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d] text-[#e6edf3]">
                      {teamsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[#8b949e] italic font-sans">
                            No security teams found. Establish one using the "New Team" button.
                          </td>
                        </tr>
                      ) : (
                        teamsList.map((team) => {
                          const parentOrg = organizationsList.find((org) => org.id === team.organizationId);
                          return (
                            <tr key={team.id} className="hover:bg-[#21262d]/40 transition-colors">
                              <td className="px-4 py-3 font-bold text-white flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                <span>{team.name}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[#8b949e]">
                                {parentOrg ? parentOrg.name : <span className="text-amber-500/70">Standalone Team</span>}
                              </td>
                              <td className="px-4 py-3 text-xs max-w-[180px] truncate text-[#8b949e]" title={team.description}>
                                {team.description || 'No custom purpose scope assigned.'}
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditTeam(team)}
                                  className="p-1 text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded cursor-pointer"
                                  title="Edit Team"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeam(team.id)}
                                  className="p-1 text-[#8b949e] hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                                  title="Delete Team"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

