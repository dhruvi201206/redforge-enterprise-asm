import React, { useState } from 'react';
import { Project, Asset, Assessment, Finding } from '../types';
import { 
  Folder, Shield, CheckCircle, Activity, 
  Users, FileText, Clipboard, Plus, Search, 
  Trash2, AlertTriangle, ExternalLink, Calendar,
  BarChart, Heart, Edit3, Settings
} from 'lucide-react';

interface ProjectWorkspaceProps {
  projects: Project[];
  assets: Asset[];
  assessments: Assessment[];
  findings: Finding[];
  onAddProject: (proj: Omit<Project, 'id' | 'createdAt'>) => void;
  onUpdateProjectNotes: (id: string, notes: string) => void;
}

type SubTab = 
  | 'overview' 
  | 'assets' 
  | 'assessments' 
  | 'findings' 
  | 'team' 
  | 'activity' 
  | 'notes';

export default function ProjectWorkspace({
  projects,
  assets,
  assessments,
  findings,
  onAddProject,
  onUpdateProjectNotes
}: ProjectWorkspaceProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  // Form states for creating a project
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjScope, setNewProjScope] = useState('');
  const [newProjRules, setNewProjRules] = useState('');

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#161B22] border border-[#30363d] rounded-xl text-center">
        <Folder className="w-12 h-12 text-[#8b949e] mb-3" />
        <h3 className="text-sm font-bold text-white">No Projects Found</h3>
        <p className="text-xs text-[#8b949e] mt-1">Create a new project workspace to begin attack surface monitoring.</p>
      </div>
    );
  }

  // Filter project-specific data based on scope matches
  const projectAssets = assets.filter(asset => 
    currentProject.scope.some(scopePattern => {
      if (scopePattern.startsWith('*.')) {
        const domain = scopePattern.slice(2);
        return asset.address.endsWith(domain);
      }
      return asset.address === scopePattern || asset.name === scopePattern;
    })
  );

  const projectFindings = findings.filter(f => 
    projectAssets.some(asset => asset.address === f.asset || asset.name === f.asset)
  );

  const projectAssessments = assessments.filter(asm => 
    asm.scope.some(scopeItem => currentProject.scope.includes(scopeItem))
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    onAddProject({
      name: newProjName,
      description: newProjDesc,
      health: 'Healthy',
      status: 'Active',
      scope: newProjScope.split(',').map(s => s.trim()).filter(Boolean),
      rulesOfEngagement: newProjRules,
      assetsCount: 0,
      findingsCount: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      assessmentsCount: 0,
      team: ['S. Architect'],
      notes: '',
      activity: [
        { id: `act-${Date.now()}`, text: 'Workspace created successfully.', timestamp: new Date().toISOString(), user: 'S. Architect' }
      ]
    });

    setNewProjName('');
    setNewProjDesc('');
    setNewProjScope('');
    setNewProjRules('');
    setShowAddProjectModal(false);
  };

  const getHealthStyle = (health: 'Healthy' | 'Degraded' | 'Critical') => {
    switch (health) {
      case 'Healthy':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Degraded':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
  };

  return (
    <div className="space-y-6" id="project-workspace-container">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#161B22] border border-[#30363d] p-4 rounded-xl" id="project-header">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <Folder className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#8b949e]">{currentProject.id}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getHealthStyle(currentProject.health)}`}>
                Health: {currentProject.health}
              </span>
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-lg font-bold text-white border-0 font-display p-0 pr-8 focus:ring-0 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0d1117] text-white text-sm">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowAddProjectModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Main layout with nested sub-tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="project-workspace-body">
        {/* Navigation Sidebar & Scope Overview */}
        <div className="space-y-4" id="project-meta-sidebar">
          <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-3 flex flex-col space-y-1">
            <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider px-3 py-2">Workspace Modules</div>
            
            {(['overview', 'assets', 'assessments', 'findings', 'team', 'activity', 'notes'] as const).map((tab) => {
              const label = tab.charAt(0).toUpperCase() + tab.slice(1);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    activeSubTab === tab
                      ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20'
                      : 'text-[#8b949e] hover:bg-[#21262d] hover:text-white border border-transparent'
                  }`}
                >
                  <span className="capitalize">{label}</span>
                  {tab === 'assets' && (
                    <span className="px-1.5 py-0.5 bg-[#30363d] text-white text-[9px] font-mono rounded-full font-bold">
                      {projectAssets.length}
                    </span>
                  )}
                  {tab === 'findings' && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-mono rounded-full font-bold">
                      {projectFindings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scope Card */}
          <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>Target Scope</span>
            </h4>
            <div className="space-y-1.5 font-mono text-[10px] text-[#8b949e]">
              {currentProject.scope.map((pattern, i) => (
                <div key={i} className="flex items-center space-x-1 bg-[#0d1117] p-1.5 rounded border border-[#30363d]">
                  <span className="text-blue-500 font-bold">&gt;</span>
                  <span className="text-white truncate">{pattern}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace Display Area */}
        <div className="lg:col-span-3 bg-[#161B22] border border-[#30363d] rounded-xl p-6 min-h-[450px] relative overflow-hidden" id="project-workspace-tab-display">
          {/* OVERVIEW SUB-TAB */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6 animate-fade-in" id="project-tab-overview">
              <div>
                <h3 className="text-base font-bold text-white font-display">Overview</h3>
                <p className="text-xs text-[#8b949e] mt-1.5 leading-relaxed">{currentProject.description}</p>
              </div>

              {/* Status Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                  <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider mb-1">Project Health</div>
                  <div className={`text-base font-bold flex items-center space-x-1.5 ${
                    currentProject.health === 'Healthy' ? 'text-green-400' : currentProject.health === 'Degraded' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    <Heart className="w-4 h-4" />
                    <span>{currentProject.health}</span>
                  </div>
                </div>

                <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                  <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider mb-1">Total Assets</div>
                  <div className="text-lg font-bold text-white font-display">{projectAssets.length} <span className="text-xs font-normal text-[#8b949e]">nodes</span></div>
                </div>

                <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                  <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider mb-1">Assessments</div>
                  <div className="text-lg font-bold text-white font-display">{projectAssessments.length} <span className="text-xs font-normal text-[#8b949e]">campaigns</span></div>
                </div>

                <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                  <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider mb-1">Total Findings</div>
                  <div className="text-lg font-bold text-white font-display text-red-500">{projectFindings.length} <span className="text-xs font-normal text-[#8b949e]">vulns</span></div>
                </div>
              </div>

              {/* Rules of Engagement */}
              <div className="bg-[#0d1117]/60 p-4 border border-[#30363d] rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Clipboard className="w-4 h-4 text-orange-500" />
                  <span>Rules of Engagement</span>
                </h4>
                <p className="text-xs text-[#8b949e] leading-relaxed whitespace-pre-line">{currentProject.rulesOfEngagement}</p>
              </div>

              {/* Creation metadata */}
              <div className="text-[10px] text-[#8b949e] font-mono flex justify-between border-t border-[#30363d]/50 pt-4">
                <span>CREATED ON: {new Date(currentProject.createdAt).toLocaleString()}</span>
                <span>STATUS: {currentProject.status}</span>
              </div>
            </div>
          )}

          {/* ASSETS SUB-TAB */}
          {activeSubTab === 'assets' && (
            <div className="space-y-4 animate-fade-in" id="project-tab-assets">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Assets ({projectAssets.length})</h3>
              </div>

              <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#161B22] text-[#8b949e] text-[9px] uppercase tracking-wider">
                    <tr className="border-b border-[#30363d]">
                      <th className="px-4 py-2.5">Asset Name</th>
                      <th className="px-4 py-2.5">Address</th>
                      <th className="px-4 py-2.5">Criticality</th>
                      <th className="px-4 py-2.5">Environment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]/50 text-xs">
                    {projectAssets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[#8b949e]">
                          No assets linked to this project scope.
                        </td>
                      </tr>
                    ) : (
                      projectAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-[#21262d]/20 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{asset.name}</td>
                          <td className="px-4 py-3 font-mono text-[#8b949e]">{asset.address}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              asset.criticality === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {asset.criticality}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8b949e]">{asset.environment}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ASSESSMENTS SUB-TAB */}
          {activeSubTab === 'assessments' && (
            <div className="space-y-4 animate-fade-in" id="project-tab-assessments">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Linked Scan Assessments ({projectAssessments.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectAssessments.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-[#8b949e] text-xs">No active assessments in scope.</div>
                ) : (
                  projectAssessments.map((asm) => (
                    <div key={asm.id} className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white">{asm.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                          asm.status === 'Active' ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-green-600/10 text-green-400 border-green-500/20'
                        }`}>
                          {asm.status}
                        </span>
                      </div>
                      <div className="w-full bg-[#161B22] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${asm.progress}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-[#8b949e]">
                        <span>PROGRESS: {asm.progress}%</span>
                        <span>FINDINGS: {asm.findingsCount}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* FINDINGS SUB-TAB */}
          {activeSubTab === 'findings' && (
            <div className="space-y-4 animate-fade-in" id="project-tab-findings">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Vulnerability Findings ({projectFindings.length})</h3>
              
              <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#161B22] text-[#8b949e] text-[9px] uppercase tracking-wider">
                    <tr className="border-b border-[#30363d]">
                      <th className="px-4 py-2.5">ID</th>
                      <th className="px-4 py-2.5">Title</th>
                      <th className="px-4 py-2.5">Severity</th>
                      <th className="px-4 py-2.5">CVSS</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]/50 text-xs">
                    {projectFindings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8b949e]">No security vulnerabilities found.</td>
                      </tr>
                    ) : (
                      projectFindings.map((f) => (
                        <tr key={f.id} className="hover:bg-[#21262d]/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-[10px] font-bold text-red-400">{f.identifier}</td>
                          <td className="px-4 py-3 font-medium text-white">{f.title}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              f.severity === 'Critical' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            }`}>
                              {f.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white">{f.cvss}</td>
                          <td className="px-4 py-3 text-[#8b949e]">{f.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEAM SUB-TAB */}
          {activeSubTab === 'team' && (
            <div className="space-y-4 animate-fade-in" id="project-tab-team">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assigned Security Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentProject.team.map((member, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs uppercase">
                      {member.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{member}</h4>
                      <p className="text-[9px] text-[#8b949e] uppercase font-mono tracking-wider">Project Operator</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVITY SUB-TAB */}
          {activeSubTab === 'activity' && (
            <div className="space-y-4 animate-fade-in" id="project-tab-activity">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Activity History</h3>
              <div className="space-y-4 border-l border-[#30363d] pl-4 ml-2 pt-2">
                {currentProject.activity.map((act) => (
                  <div key={act.id} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#161B22]" />
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e]">
                      <span>{new Date(act.timestamp).toLocaleTimeString()} UTC</span>
                      <span className="text-blue-400">{act.user}</span>
                    </div>
                    <p className="text-xs text-[#e6edf3]">{act.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTES SUB-TAB */}
          {activeSubTab === 'notes' && (
            <div className="space-y-4 animate-fade-in flex flex-col h-full" id="project-tab-notes">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operational Notes</h3>
                <span className="text-[10px] font-mono text-[#8b949e]">AUTOSAVED TO SAAS REGISTRY</span>
              </div>
              <textarea
                value={currentProject.notes}
                onChange={(e) => onUpdateProjectNotes(currentProject.id, e.target.value)}
                placeholder="Type critical project logs, findings context, or mitigation schedules..."
                className="w-full flex-1 min-h-[220px] p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-blue-500 transition-colors font-mono resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="add-project-modal">
          <div className="bg-[#161B22] border border-[#30363d] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 font-display">Create Attack Surface Workspace</h3>
            <p className="text-xs text-[#8b949e] mb-4">Establish a secure sandbox workspace to crawl, scan, and list assets.</p>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs text-[#e6edf3]">
              <div className="space-y-1">
                <label className="font-semibold text-[#8b949e]">Workspace Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Cloud Perimeter Mapping"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#8b949e]">Description</label>
                <textarea
                  placeholder="Summarize target system architecture, main owners, and business goals..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white h-16 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#8b949e]">Target Scope Patterns (Comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. *.reforge.io, api.prod.reforge.io, 10.240.12.83"
                  value={newProjScope}
                  onChange={(e) => setNewProjScope(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#8b949e]">Rules of Engagement</label>
                <textarea
                  placeholder="e.g. Scanning hours, max query request rate limit, forbidden actions..."
                  value={newProjRules}
                  onChange={(e) => setNewProjRules(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white h-20 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="flex-1 py-2.5 bg-[#30363d] hover:bg-[#444c56] text-white rounded-lg font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all cursor-pointer"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
