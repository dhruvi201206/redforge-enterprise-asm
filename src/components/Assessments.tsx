import React, { useState } from 'react';
import { Assessment, AssessmentStatus } from '../types';
import { Calendar, Plus, Users, Target, ShieldAlert, CheckCircle, Search, RefreshCw, BookOpen } from 'lucide-react';

interface AssessmentsProps {
  assessments: Assessment[];
  onAddAssessment: (assessment: Omit<Assessment, 'id' | 'progress' | 'findingsCount'>) => void;
  onUpdateAssessmentStatus: (id: string, status: AssessmentStatus) => void;
}

export default function Assessments({
  assessments,
  onAddAssessment,
  onUpdateAssessmentStatus
}: AssessmentsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New assessment states
  const [newName, setNewName] = useState('');
  const [newScopeString, setNewScopeString] = useState('');
  const [newRoE, setNewRoE] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-07-10');
  const [newEndDate, setNewEndDate] = useState('2026-07-20');
  const [newTeamString, setNewTeamString] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    onAddAssessment({
      name: newName,
      scope: newScopeString.split(',').map(s => s.trim()).filter(Boolean),
      rulesOfEngagement: newRoE || 'Passive visual verification scans only.',
      status: 'Scheduled',
      startDate: newStartDate,
      endDate: newEndDate,
      assignedTeam: newTeamString.split(',').map(t => t.trim()).filter(Boolean)
    });

    setNewName('');
    setNewScopeString('');
    setNewRoE('');
    setNewStartDate('2026-07-10');
    setNewEndDate('2026-07-20');
    setNewTeamString('');
    setShowAddModal(false);
  };

  const filteredAssessments = assessments.filter(asm =>
    asm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asm.scope.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="assessments-panel">
      {/* Search & Actions Header */}
      <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" id="assessments-header">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#8b949e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search campaigns, targeting scopes, rules of engagement..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 transition-all"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 text-xs transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Campaign</span>
        </button>
      </div>

      {/* Grid of Assessments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="assessments-grid">
        {filteredAssessments.length === 0 ? (
          <div className="col-span-2 bg-[#161B22] border border-[#30363d] rounded-xl p-12 text-center text-[#8b949e] text-xs">
            No scheduled or active vulnerability assessment projects found.
          </div>
        ) : (
          filteredAssessments.map((asm) => (
            <div key={asm.id} className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col justify-between space-y-4 shadow-sm" id={`asm-card-${asm.id}`}>
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-mono text-[#8b949e] uppercase font-bold">{asm.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1 font-display leading-tight">{asm.name}</h4>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    asm.status === 'Active'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : asm.status === 'Completed'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {asm.status}
                  </span>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#8b949e] font-mono">
                  <span>Vulnerability Scan Progression</span>
                  <span>{asm.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#30363d] rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${asm.progress}%` }}></div>
                </div>
              </div>

              {/* Scope Mapping */}
              <div className="space-y-2 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]" id="asm-scope-specs">
                <div className="flex items-center space-x-1 text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  <span>Target Scope Boundaries</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {asm.scope.map((s, idx) => (
                    <span key={idx} className="bg-[#21262d] border border-[#30363d] text-[#e6edf3] font-mono text-[10px] px-2 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rules of engagement */}
              <div className="space-y-1" id="asm-roe-box">
                <div className="flex items-center space-x-1 text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Rules of Engagement (RoE)</span>
                </div>
                <p className="text-[11px] text-[#8b949e] italic leading-relaxed pl-1">
                  "{asm.rulesOfEngagement}"
                </p>
              </div>

              {/* Footer specs */}
              <div className="border-t border-[#30363d] pt-3 flex justify-between items-center text-xs text-[#8b949e]" id="asm-footer">
                <div className="flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-[#8b949e]" />
                  <span>Team size: <strong className="text-white">{asm.assignedTeam.join(', ')}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={asm.status}
                    onChange={(e) => onUpdateAssessmentStatus(asm.id, e.target.value as AssessmentStatus)}
                    className="bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded px-2 py-1 text-[10px]"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" id="add-asm-modal-wrapper">
          <div className="bg-[#161B22] border border-[#30363d] w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-fadeIn" id="add-asm-modal">
            <h3 className="text-base font-bold text-white mb-4 font-display">Schedule Offense Campaign</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Campaign Title Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Q4 Kubernetes Microservice penetration"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Target Scope (Comma Separated)</label>
                <input
                  type="text"
                  required
                  value={newScopeString}
                  onChange={(e) => setNewScopeString(e.target.value)}
                  placeholder="e.g. api.prod.reforge.io, portal.auth.internal"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Rules of Engagement (ROE)</label>
                <textarea
                  value={newRoE}
                  onChange={(e) => setNewRoE(e.target.value)}
                  placeholder="e.g. Do not scan DB directly on weekends. No destructive testing."
                  rows={2}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold mb-1.5">Assigned Operator Team</label>
                <input
                  type="text"
                  value={newTeamString}
                  onChange={(e) => setNewTeamString(e.target.value)}
                  placeholder="e.g. S. Architect, Lead Pentester"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-3 justify-end" id="add-asm-actions">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-transparent hover:bg-[#21262d] text-[#8b949e] hover:text-white border border-[#30363d] px-4 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
