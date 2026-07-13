import React, { useState } from 'react';
import { Finding, FindingStatus, SeverityLevel } from '../types';
import { 
  Shield, AlertTriangle, CheckCircle, Search, Layers, Calculator, Play, List, 
  HelpCircle, User, Info, ArrowRight, MessageSquare, History, Paperclip, 
  Terminal, ShieldAlert, Clock, ChevronRight, UploadCloud, Check, Sparkles
} from 'lucide-react';

interface FindingsLabProps {
  findings: Finding[];
  onUpdateFindingStatus: (id: string, newStatus: FindingStatus) => void;
  onUpdateFindingCVSS: (id: string, score: number) => void;
  onAddFindingComment?: (findingId: string, commentText: string) => void;
  onUploadFindingAttachment?: (findingId: string, fileName: string) => void;
}

export default function FindingsLab({
  findings,
  onUpdateFindingStatus,
  onUpdateFindingCVSS,
  onAddFindingComment,
  onUploadFindingAttachment
}: FindingsLabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'kanban' | 'mappings' | 'cvss-calc'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedFindingId, setSelectedFindingId] = useState<string>(findings[0]?.id || '');

  // Finding inspector sub-tabs
  const [inspectorSubTab, setInspectorSubTab] = useState<'details' | 'poc' | 'comments' | 'history' | 'attachments'>('details');

  // New Comment input
  const [commentText, setCommentText] = useState('');
  // New Attachment input
  const [dragActive, setDragActive] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  // CVSS Calculator State
  const [cvssAV, setCvssAV] = useState<number>(0.85); // Network: 0.85, Adjacent: 0.62, Local: 0.55, Physical: 0.2
  const [cvssAC, setCvssAC] = useState<number>(0.77); // Low: 0.77, High: 0.44
  const [cvssPR, setCvssPR] = useState<number>(0.85); // None: 0.85, Low: 0.62, High: 0.27
  const [cvssUI, setCvssUI] = useState<number>(0.85); // None: 0.85, Required: 0.62
  const [cvssC, setCvssC] = useState<number>(0.56);  // High: 0.56, Low: 0.22, None: 0
  const [cvssI, setCvssI] = useState<number>(0.56);  // High: 0.56, Low: 0.22, None: 0
  const [cvssA, setCvssA] = useState<number>(0.56);  // High: 0.56, Low: 0.22, None: 0

  const calculateCVSS = () => {
    const exploitability = 8.22 * cvssAV * cvssAC * cvssPR * cvssUI;
    const impactMultiplier = 1 - (1 - cvssC) * (1 - cvssI) * (1 - cvssA);
    const impact = 7.52 * (impactMultiplier - 0.029) - 3.25 * Math.pow(impactMultiplier - 0.02, 15);
    
    let baseScore = 0;
    if (impactMultiplier <= 0) {
      baseScore = 0;
    } else {
      baseScore = Math.min(Math.round((exploitability + impact) * 10) / 10, 10.0);
    }
    return isNaN(baseScore) || baseScore < 0 ? 0 : baseScore;
  };

  const calculatedScore = calculateCVSS();

  // Find currently selected finding
  const selectedFinding = findings.find(f => f.id === selectedFindingId) || findings[0] || null;

  // Filtered Findings
  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cwe.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = selectedSeverity === 'All' || f.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  const getSeverityStyle = (severity: SeverityLevel) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'High':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const statusColumns: FindingStatus[] = ['Open', 'In Triage', 'Assigned', 'Resolved', 'Closed'];

  // Add Comment local executor
  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedFinding) return;

    if (onAddFindingComment) {
      onAddFindingComment(selectedFinding.id, commentText);
    } else {
      // Inline state fallback simulation
      if (!selectedFinding.comments) {
        selectedFinding.comments = [];
      }
      selectedFinding.comments.push({
        id: Math.random().toString(),
        user: 'admin@redforge.io',
        text: commentText,
        timestamp: new Date().toISOString()
      });
      // Add audit history
      if (!selectedFinding.history) {
        selectedFinding.history = [];
      }
      selectedFinding.history.push({
        id: Math.random().toString(),
        user: 'admin@redforge.io',
        action: `Added coordination comment: "${commentText.slice(0, 30)}..."`,
        timestamp: new Date().toISOString()
      });
    }

    setCommentText('');
  };

  // Upload Attachment simulation
  const handleUploadClick = () => {
    if (!uploadFileName.trim() || !selectedFinding) return;
    if (onUploadFindingAttachment) {
      onUploadFindingAttachment(selectedFinding.id, uploadFileName);
    } else {
      if (!selectedFinding.attachments) {
        selectedFinding.attachments = [];
      }
      selectedFinding.attachments.push(uploadFileName);

      if (!selectedFinding.history) {
        selectedFinding.history = [];
      }
      selectedFinding.history.push({
        id: Math.random().toString(),
        user: 'admin@redforge.io',
        action: `Uploaded cryptographic payload artifact: ${uploadFileName}`,
        timestamp: new Date().toISOString()
      });
    }
    setUploadFileName('');
  };

  // Apply Calculated CVSS
  const handleApplyCVSS = () => {
    if (!selectedFinding) return;
    onUpdateFindingCVSS(selectedFinding.id, calculatedScore);
    
    if (!selectedFinding.history) {
      selectedFinding.history = [];
    }
    selectedFinding.history.push({
      id: Math.random().toString(),
      user: 'admin@redforge.io',
      action: `Recalculated perimeter risk vector base CVSS to ${calculatedScore}`,
      timestamp: new Date().toISOString()
    });

    alert(`Successfully synchronized CVSS base score ${calculatedScore} to ${selectedFinding.identifier}.`);
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-2" id="findings-panel">
      
      {/* Platform Ledger Tabs */}
      <div className="flex border-b border-[#30363d] pb-px" id="findings-nav">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'list'
              ? 'border-red-600 text-white font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <List className="w-4 h-4 text-blue-400" />
          <span>Vulnerability Ledger</span>
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'kanban'
              ? 'border-red-600 text-white font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Remediation Kanban</span>
        </button>
        <button
          onClick={() => setActiveTab('mappings')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'mappings'
              ? 'border-red-600 text-white font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-orange-400" />
          <span>Vulnerability Mappings</span>
        </button>
        <button
          onClick={() => setActiveTab('cvss-calc')}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'cvss-calc'
              ? 'border-red-600 text-white font-semibold'
              : 'border-transparent text-[#8b949e] hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4 text-red-500" />
          <span>CVSS v3.1 Matrix Engine</span>
        </button>
      </div>

      {/* View 1: Ledger + Detailed Inspector Grid */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="findings-ledger-view">
          
          {/* Left Vulnerabilities Rail */}
          <div className="lg:col-span-5 space-y-4 flex flex-col" id="findings-left-rail">
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-4 space-y-3 shadow-sm" id="ledger-search-filters">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8b949e]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by CVE, CWE, title, target..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 placeholder-[#8b949e]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-[11px] text-[#8b949e] flex items-center justify-between font-mono font-bold">
                  <span>Count:</span>
                  <span className="text-white">{filteredFindings.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#161B22] border border-[#30363d] rounded-xl overflow-hidden divide-y divide-[#30363d]/50 max-h-[580px] overflow-y-auto flex-1 shadow-md" id="findings-scroll-list">
              {filteredFindings.length === 0 ? (
                <div className="p-12 text-center text-[#8b949e] text-xs">
                  No vulnerabilities match the criteria limits.
                </div>
              ) : (
                filteredFindings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFindingId(f.id);
                    }}
                    className={`p-4 cursor-pointer transition-all flex flex-col space-y-2 border-l-3 ${
                      selectedFinding?.id === f.id 
                        ? 'bg-[#21262d] border-l-red-600' 
                        : 'hover:bg-[#21262d]/40 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[10px] text-red-400 font-bold">{f.identifier}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSeverityStyle(f.severity)}`}>
                        {f.severity}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate max-w-xs">{f.title}</h4>
                    <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                      <span className="truncate max-w-[180px] font-mono">{f.asset}</span>
                      <span className="font-mono bg-[#0d1117] px-1.5 py-0.5 rounded text-white text-[9px] border border-[#30363d]">CVSS: {f.cvss}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Detailed Inspector Panel */}
          <div className="lg:col-span-7 bg-[#161B22] border border-[#30363d] rounded-xl p-6 flex flex-col space-y-5 shadow-lg min-h-[500px]" id="findings-inspector">
            {selectedFinding ? (
              <div className="space-y-5 flex-1 flex flex-col justify-between" id={`inspector-${selectedFinding.id}`}>
                
                {/* Inspector Header */}
                <div className="border-b border-[#30363d] pb-4 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">{selectedFinding.identifier}</span>
                    <h3 className="text-base font-bold text-white mt-1 font-display leading-tight">{selectedFinding.title}</h3>
                    <p className="text-xs text-[#8b949e] font-mono mt-1.5">Affected Endpoint Target: <span className="text-white bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d] font-bold">{selectedFinding.asset}</span></p>
                  </div>
                  <div className="flex flex-col items-end space-y-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityStyle(selectedFinding.severity)}`}>
                      {selectedFinding.severity}
                    </span>
                    <span className="text-[10px] font-bold text-[#8b949e] font-mono">CVSS SCORE: <strong className="text-white">{selectedFinding.cvss}</strong></span>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex border-b border-[#30363d] text-xs" id="inspector-tabs">
                  <button
                    onClick={() => setInspectorSubTab('details')}
                    className={`pb-2 pr-3 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      inspectorSubTab === 'details' ? 'text-red-500 border-b border-red-500' : 'text-[#8b949e] hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Details & Fix</span>
                  </button>
                  <button
                    onClick={() => setInspectorSubTab('poc')}
                    className={`pb-2 px-3 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      inspectorSubTab === 'poc' ? 'text-red-500 border-b border-red-500' : 'text-[#8b949e] hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Evidence / PoC</span>
                  </button>
                  <button
                    onClick={() => setInspectorSubTab('comments')}
                    className={`pb-2 px-3 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      inspectorSubTab === 'comments' ? 'text-red-500 border-b border-red-500' : 'text-[#8b949e] hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Discussion ({selectedFinding.comments?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setInspectorSubTab('history')}
                    className={`pb-2 px-3 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      inspectorSubTab === 'history' ? 'text-red-500 border-b border-red-500' : 'text-[#8b949e] hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Timeline ({selectedFinding.history?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setInspectorSubTab('attachments')}
                    className={`pb-2 pl-3 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      inspectorSubTab === 'attachments' ? 'text-red-500 border-b border-red-500' : 'text-[#8b949e] hover:text-white'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Payloads ({selectedFinding.attachments?.length || 0})</span>
                  </button>
                </div>

                {/* Sub-tab Content Area */}
                <div className="flex-1 min-h-[300px] overflow-y-auto" id="inspector-content">
                  
                  {/* Tab A: Details & Remediation */}
                  {inspectorSubTab === 'details' && (
                    <div className="space-y-4" id="inspector-subtab-details">
                      {/* Description */}
                      <div className="text-xs space-y-1 bg-[#0d1117] p-4.5 rounded-lg border border-[#30363d]">
                        <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-red-400">Detailed Exploit Vector Overview</h4>
                        <p className="text-[#e6edf3] leading-relaxed mt-1.5">{selectedFinding.description || 'This vulnerability maps directly to an active perimeter endpoint exposing software mismatch vectors. Immediate patching procedures required.'}</p>
                      </div>

                      {/* Framework Mappings */}
                      <div className="grid grid-cols-3 gap-3" id="finding-mappings">
                        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                          <div className="text-[9px] text-[#8b949e] font-bold uppercase">MITRE ATT&amp;CK Matrix</div>
                          <div className="text-xs font-mono font-medium text-white truncate mt-1">{selectedFinding.mitreAttack}</div>
                        </div>
                        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                          <div className="text-[9px] text-[#8b949e] font-bold uppercase">CWE Weakness</div>
                          <div className="text-xs font-mono font-medium text-white truncate mt-1">{selectedFinding.cwe}</div>
                        </div>
                        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]">
                          <div className="text-[9px] text-[#8b949e] font-bold uppercase">OWASP Vector</div>
                          <div className="text-xs font-mono font-medium text-white truncate mt-1">{selectedFinding.owasp}</div>
                        </div>
                      </div>

                      {/* Technical Mitigation / Fix recommendations */}
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-white mb-1.5 flex items-center space-x-1.5">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-[10px] uppercase font-bold tracking-wider text-green-400">Remediation Script & Recommendations</span>
                        </h4>
                        <p className="text-xs text-[#e6edf3] leading-relaxed font-mono">
                          {selectedFinding.recommendation}
                        </p>
                      </div>

                      {/* External references */}
                      <div>
                        <h4 className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wide mb-1.5">Threat Intel Feeds & Disclosures</h4>
                        <ul className="space-y-1 text-xs text-[#8b949e] font-mono" id="references-list">
                          {selectedFinding.references.map((ref, idx) => (
                            <li key={idx} className="truncate">
                              <a href={ref} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                {ref}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Tab B: PoC & Cryptographic Evidence */}
                  {inspectorSubTab === 'poc' && (
                    <div className="space-y-4" id="inspector-subtab-poc">
                      <div>
                        <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1">Sandbox Exploit Payload Code</h4>
                        <pre className="bg-[#0d1117] text-[#58a6ff] p-4 rounded-lg font-mono text-[11px] overflow-x-auto border border-[#30363d] leading-relaxed">
                          {selectedFinding.proofOfConcept}
                        </pre>
                      </div>

                      {selectedFinding.evidence && (
                        <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-lg space-y-1">
                          <h4 className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Passive Scan Output Evidence</h4>
                          <p className="text-xs text-[#e6edf3] font-mono whitespace-pre-wrap leading-relaxed mt-1">{selectedFinding.evidence}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab C: Real-Time Collaborative Discussions */}
                  {inspectorSubTab === 'comments' && (
                    <div className="space-y-4" id="inspector-subtab-comments">
                      <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1" id="comments-timeline">
                        {(!selectedFinding.comments || selectedFinding.comments.length === 0) ? (
                          <div className="p-8 text-center text-[#8b949e] text-xs">
                            No coordination logs registered for this threat finding.
                          </div>
                        ) : (
                          selectedFinding.comments.map((comm) => (
                            <div key={comm.id} className="bg-[#0d1117] border border-[#30363d] p-3.5 rounded-lg space-y-1.5 text-xs text-[#e6edf3]">
                              <div className="flex justify-between items-center border-b border-[#30363d]/30 pb-1 text-[#8b949e] font-mono text-[10px]">
                                <span className="font-bold text-blue-400">{comm.user}</span>
                                <span>{new Date(comm.timestamp).toLocaleString()} UTC</span>
                              </div>
                              <p className="leading-relaxed font-sans">{comm.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment input form */}
                      <form onSubmit={handleAddCommentSubmit} className="border-t border-[#30363d] pt-3 flex items-center space-x-2">
                        <input
                          type="text"
                          required
                          placeholder="Post engineering comment, CVE updates, remediation notes..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-600 placeholder-[#8b949e]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                        >
                          Send Log
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Tab D: Audit Timeline & History */}
                  {inspectorSubTab === 'history' && (
                    <div className="space-y-3" id="inspector-subtab-history">
                      <h4 className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider mb-2">Audit ledger of state modifications</h4>
                      <div className="space-y-2.5 max-h-[260px] overflow-y-auto" id="history-trail">
                        {(!selectedFinding.history || selectedFinding.history.length === 0) ? (
                          <div className="bg-[#0d1117] border border-[#30363d] p-4.5 rounded-lg text-center text-[#8b949e] text-xs">
                            Audit trail initialized. Original discovery timestamp: {new Date(selectedFinding.discoveredAt).toLocaleString()}
                          </div>
                        ) : (
                          selectedFinding.history.map((hist) => (
                            <div key={hist.id} className="flex items-start space-x-2.5 text-xs border-b border-[#30363d]/40 pb-2 last:border-b-0">
                              <Clock className="w-3.5 h-3.5 text-[#8b949e] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-[10px] text-[#8b949e] font-mono flex justify-between">
                                  <span className="font-bold text-white">{hist.user}</span>
                                  <span>{new Date(hist.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-[#e6edf3] font-mono text-[11px] mt-0.5">{hist.action}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab E: Cryptographic Payloads & Attached Artifacts */}
                  {inspectorSubTab === 'attachments' && (
                    <div className="space-y-4 text-xs text-[#e6edf3]" id="inspector-subtab-attachments">
                      <div className="border border-dashed border-[#30363d] hover:border-red-500 bg-[#0d1117] rounded-xl p-6 text-center transition-all">
                        <UploadCloud className="w-8 h-8 text-[#8b949e] mx-auto mb-2" />
                        <span className="font-bold block text-white">Upload Vulnerability Attachment Payload</span>
                        <span className="text-[10px] text-[#8b949e] block mt-1">Accepts PCAPs, JSON logs, raw payloads, or screenshots. Max 10MB limit.</span>
                        
                        <div className="mt-3 flex items-center justify-center space-x-2 max-w-xs mx-auto">
                          <input
                            type="text"
                            placeholder="File name (e.g. proof.pcap)"
                            value={uploadFileName}
                            onChange={(e) => setUploadFileName(e.target.value)}
                            className="bg-[#161B22] border border-[#30363d] px-2 py-1 text-[11px] rounded text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleUploadClick}
                            className="bg-red-600 hover:bg-red-700 text-white text-[11px] px-2.5 py-1 rounded font-bold transition-all cursor-pointer"
                          >
                            Upload
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2" id="attachments-ledger">
                        <h4 className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider">Cryptographic Artifacts Registry</h4>
                        {(!selectedFinding.attachments || selectedFinding.attachments.length === 0) ? (
                          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-center text-[#8b949e] text-[11px]">
                            No binary payloads registered to this exploit chain.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {selectedFinding.attachments.map((file, idx) => (
                              <div key={idx} className="bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-lg flex items-center justify-between font-mono text-[11px]">
                                <span className="text-white truncate max-w-[150px]">{file}</span>
                                <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/15">ACTIVE SHIELD</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* Status Assignment & Escalation Panel */}
                <div className="border-t border-[#30363d] pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs" id="inspector-actions">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#8b949e]" />
                    <span className="text-[#8b949e]">Assigned Custodian: <strong className="text-white font-mono bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">{selectedFinding.assignedTo || 'Unassigned'}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#8b949e]">Status Action:</span>
                    <select
                      value={selectedFinding.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as FindingStatus;
                        onUpdateFindingStatus(selectedFinding.id, nextStatus);
                        // Add audit history entry
                        if (!selectedFinding.history) {
                          selectedFinding.history = [];
                        }
                        selectedFinding.history.push({
                          id: Math.random().toString(),
                          user: 'admin@redforge.io',
                          action: `Changed remediation state status to: ${nextStatus}`,
                          timestamp: new Date().toISOString()
                        });
                      }}
                      className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white cursor-pointer font-bold"
                    >
                      <option value="Open">Open</option>
                      <option value="In Triage">In Triage</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#8b949e] text-xs">
                Select a threat exposure from the vulnerability ledger to load the audit inspector deck.
              </div>
            )}
          </div>

        </div>
      )}

      {/* View 2: Remediation Kanban Board */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4" id="findings-kanban-view">
          {statusColumns.map((col) => {
            const columnFindings = findings.filter((f) => f.status === col);
            return (
              <div key={col} className="bg-[#161B22] border border-[#30363d] rounded-xl p-4 flex flex-col space-y-4 h-[550px] shadow-sm" id={`kanban-col-${col.replace(' ', '-')}`}>
                
                <div className="flex justify-between items-center border-b border-[#30363d] pb-2">
                  <h4 className="text-xs font-bold text-white font-display uppercase tracking-wider">{col}</h4>
                  <span className="bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {columnFindings.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1" id={`kanban-cards-${col.replace(' ', '-')}`}>
                  {columnFindings.length === 0 ? (
                    <div className="h-full border border-dashed border-[#30363d] rounded-lg flex items-center justify-center p-4 text-[#8b949e] text-[10px] text-center">
                      No cards here.
                    </div>
                  ) : (
                    columnFindings.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFindingId(f.id);
                          setActiveTab('list');
                        }}
                        className="bg-[#0d1117] border border-[#30363d] p-3.5 rounded-lg space-y-2 shadow hover:border-red-600/40 transition-all flex flex-col cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-red-400 font-bold">{f.identifier}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getSeverityStyle(f.severity)}`}>
                            {f.severity}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white line-clamp-2 leading-relaxed">{f.title}</h5>
                        <div className="text-[10px] text-[#8b949e] truncate font-mono">{f.asset}</div>

                        {/* Shift buttons representation for simple, bug-free UX */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#30363d] mt-2">
                          <span className="text-[8px] text-[#8b949e] uppercase font-bold tracking-wider">Shift State:</span>
                          <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                            {statusColumns.map((targetCol) => {
                              if (targetCol === col) return null;
                              return (
                                <button
                                  key={targetCol}
                                  onClick={() => {
                                    onUpdateFindingStatus(f.id, targetCol);
                                    if (!f.history) f.history = [];
                                    f.history.push({
                                      id: Math.random().toString(),
                                      user: 'admin@redforge.io',
                                      action: `Escalated/moved Kanban card status to: ${targetCol}`,
                                      timestamp: new Date().toISOString()
                                    });
                                  }}
                                  title={`Move to ${targetCol}`}
                                  className="px-1 py-0.5 bg-[#21262d] hover:bg-red-600 text-[#8b949e] hover:text-white rounded text-[8px] transition-colors cursor-pointer"
                                >
                                  {targetCol.slice(0, 2)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* View 3: CVSS v3.1 Interactive Metric Configurator */}
      {activeTab === 'cvss-calc' && (
        <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 shadow-sm space-y-6" id="findings-cvss-view">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 border-b border-[#30363d] pb-6">
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-red-500 animate-pulse" />
                <span>Enterprise Common Vulnerability Scoring System (CVSS v3.1)</span>
              </h3>
              <p className="text-xs text-[#8b949e] mt-1">Configure threat vectors and security metrics to mathematically compute threat severity indices.</p>
            </div>

            {/* Live readout */}
            <div className="flex items-center space-x-4 bg-[#0d1117] p-4 rounded-xl border border-[#30363d]" id="calculator-result-card">
              <div>
                <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Calculated Score</div>
                <div className="text-3xl font-black font-display text-red-500">{calculatedScore}</div>
              </div>
              <div className="h-10 w-px bg-[#30363d]"></div>
              <div>
                <div className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Severity Rating</div>
                <div className={`px-2 py-0.5 rounded font-bold text-[10px] border mt-1.5 ${
                  calculatedScore >= 9.0
                    ? 'bg-red-500/20 text-red-500 border-red-500/30'
                    : calculatedScore >= 7.0
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    : calculatedScore >= 4.0
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {calculatedScore >= 9.0 ? 'CRITICAL' : calculatedScore >= 7.0 ? 'HIGH' : calculatedScore >= 4.0 ? 'MEDIUM' : 'LOW'}
                </div>
              </div>
              {selectedFinding && (
                <>
                  <div className="h-10 w-px bg-[#30363d]"></div>
                  <button
                    onClick={handleApplyCVSS}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center space-x-1 cursor-pointer font-display shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Apply to {selectedFinding.identifier}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Calculator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="calculator-inputs-grid">
            
            {/* Attack Vector */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Attack Vector (AV)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Network (0.85)', val: 0.85 },
                  { label: 'Adjacent (0.62)', val: 0.62 },
                  { label: 'Local (0.55)', val: 0.55 },
                  { label: 'Physical (0.2)', val: 0.2 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssAV(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssAV === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attack Complexity */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Attack Complexity (AC)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Low (0.77)', val: 0.77 },
                  { label: 'High (0.44)', val: 0.44 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssAC(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssAC === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Privileges Required */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Privileges Required (PR)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'None (0.85)', val: 0.85 },
                  { label: 'Low (0.62)', val: 0.62 },
                  { label: 'High (0.27)', val: 0.27 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssPR(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssPR === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User Interaction */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">User Interaction (UI)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'None (0.85)', val: 0.85 },
                  { label: 'Required (0.62)', val: 0.62 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssUI(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssUI === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidentiality Impact */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Confidentiality Impact (C)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'None (0)', val: 0 },
                  { label: 'Low (0.22)', val: 0.22 },
                  { label: 'High (0.56)', val: 0.56 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssC(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssC === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Integrity Impact */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Integrity Impact (I)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'None (0)', val: 0 },
                  { label: 'Low (0.22)', val: 0.22 },
                  { label: 'High (0.56)', val: 0.56 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssI(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssI === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Impact */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Availability Impact (A)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'None (0)', val: 0 },
                  { label: 'Low (0.22)', val: 0.22 },
                  { label: 'High (0.56)', val: 0.56 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setCvssA(item.val)}
                    className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-all cursor-pointer ${
                      cvssA === item.val
                        ? 'bg-red-600/10 border-red-500 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Explanation banner */}
          <div className="bg-[#0d1117] p-4.5 rounded-lg border border-[#30363d]" id="calculator-explanation">
            <h4 className="text-xs font-bold text-white mb-1.5 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-blue-400" />
              <span>Attack Surface Exposure Modeling</span>
            </h4>
            <p className="text-[11px] text-[#8b949e] leading-relaxed">
              Applying the calculated score dynamically synchronizes severity ratings to the selected active security ledger. This mathematical threat risk indexing helps security analysts prioritize patch order according to live network vulnerability metrics.
            </p>
          </div>

        </div>
      )}

      {/* View 4: MITRE ATT&CK & OWASP Mappings */}
      {activeTab === 'mappings' && (
        <div className="space-y-6" id="findings-mappings-view">
          
          {/* Section 1: MITRE ATT&CK Matrix Grid */}
          <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 shadow-md" id="mitre-matrix-card">
            <div className="border-b border-[#30363d] pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
                  <span>Active MITRE ATT&amp;CK Enterprise Matrix Mapping</span>
                </h3>
                <p className="text-[11px] text-[#8b949e] mt-1">
                  Techniques detected in active findings are color-coded in real-time with threat indicator badges.
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#8b949e] bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                Dossier Alignment: v14.1
              </div>
            </div>

            {/* Matrix Columns */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3" id="mitre-matrix-cols">
              
              {/* Tactic A: Recon */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <span className="text-[9px] uppercase tracking-widest text-[#8b949e] font-bold block border-b border-[#30363d] pb-1">TA0043 Recon</span>
                <div className="space-y-1.5">
                  <div className="p-2 rounded bg-[#161B22] border border-[#30363d] text-[10px]">
                    <span className="font-bold block text-white">T1595 Active Scan</span>
                    <span className="text-[#8b949e] text-[9px]">Continuous ASM sweeps</span>
                    <span className="mt-1.5 inline-block px-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono text-[8px] font-bold">1 ENG Trigger</span>
                  </div>
                </div>
              </div>

              {/* Tactic B: Initial Access */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <span className="text-[9px] uppercase tracking-widest text-[#8b949e] font-bold block border-b border-[#30363d] pb-1">TA0001 Init Access</span>
                <div className="space-y-1.5">
                  {/* T1190 */}
                  {findings.some(f => f.mitreAttack.includes('T1190')) ? (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-[10px] relative">
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                      <span className="font-bold block text-white">T1190 Public Exploit</span>
                      <span className="text-[#8b949e] text-[9px]">Web app injections</span>
                      <span className="mt-1.5 inline-block px-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono text-[8px] font-bold">
                        {findings.filter(f => f.mitreAttack.includes('T1190')).length} findings mapped
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-[#161B22]/30 border border-[#30363d]/40 text-[10px] opacity-40">
                      <span className="font-bold block text-[#8b949e]">T1190 Public Exploit</span>
                    </div>
                  )}

                  {/* T1078 */}
                  {findings.some(f => f.mitreAttack.includes('T1078')) ? (
                    <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30 text-[10px] relative">
                      <span className="font-bold block text-white">T1078 Valid Account</span>
                      <span className="text-[#8b949e] text-[9px]">Default credentials</span>
                      <span className="mt-1.5 inline-block px-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-mono text-[8px] font-bold">
                        {findings.filter(f => f.mitreAttack.includes('T1078')).length} mapped
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-[#161B22]/30 border border-[#30363d]/40 text-[10px] opacity-40">
                      <span className="font-bold block text-[#8b949e]">T1078 Valid Account</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tactic C: Persistence */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <span className="text-[9px] uppercase tracking-widest text-[#8b949e] font-bold block border-b border-[#30363d] pb-1">TA0003 Persistence</span>
                <div className="space-y-1.5">
                  {findings.some(f => f.mitreAttack.includes('T1505')) ? (
                    <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-[10px]">
                      <span className="font-bold block text-white">T1505 Server Component</span>
                      <span className="text-[#8b949e] text-[9px]">Web shell deployments</span>
                      <span className="mt-1.5 inline-block px-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded font-mono text-[8px] font-bold">ACTIVE RISK</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-[#161B22]/30 border border-[#30363d]/40 text-[10px] opacity-40">
                      <span className="font-bold block text-[#8b949e]">T1505 Web Component</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tactic D: Credential Access */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <span className="text-[9px] uppercase tracking-widest text-[#8b949e] font-bold block border-b border-[#30363d] pb-1">TA0006 Cred Access</span>
                <div className="space-y-1.5">
                  {findings.some(f => f.mitreAttack.includes('T1539')) ? (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-[10px]">
                      <span className="font-bold block text-white">T1539 Steal Cookies</span>
                      <span className="text-[#8b949e] text-[9px]">Broken token states</span>
                      <span className="mt-1.5 inline-block px-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono text-[8px] font-bold">CRITICAL</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-[#161B22]/30 border border-[#30363d]/40 text-[10px] opacity-40">
                      <span className="font-bold block text-[#8b949e]">T1539 Steal Cookies</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tactic E: Impact */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <span className="text-[9px] uppercase tracking-widest text-[#8b949e] font-bold block border-b border-[#30363d] pb-1">TA0040 Impact</span>
                <div className="space-y-1.5">
                  <div className="p-2 rounded bg-[#161B22] border border-[#30363d] text-[10px]">
                    <span className="font-bold block text-white">T1485 Data Destruction</span>
                    <span className="text-[#8b949e] text-[9px]">Potential ransomware impact</span>
                    <span className="mt-1.5 inline-block px-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded font-mono text-[8px]">Unexposed</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: CWE and OWASP Top 10 breakdown side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="mappings-lower-row">
            
            {/* Left: OWASP Top 10 breakdown */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 shadow-md" id="owasp-mapping-card">
              <h3 className="text-sm font-bold text-white font-display border-b border-[#30363d] pb-2 mb-4 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>OWASP Top 10 (2021) Category Breakdown</span>
              </h3>
              
              <div className="space-y-3" id="owasp-list">
                {[
                  { cat: 'A01:2021-Broken Access Control', desc: 'Vulnerabilities where user restrictions are not properly enforced (IDOR, path traversal).' },
                  { cat: 'A02:2021-Cryptographic Failures', desc: 'Insecure data transmission, storage, or weak cryptographical standards.' },
                  { cat: 'A03:2021-Injection', desc: 'SQL, NoSQL, or Command injections resulting from untrusted parameter input execution.' },
                  { cat: 'A05:2021-Security Misconfiguration', desc: 'Unpatched software, default admin consoles, or debugging channels left active.' },
                  { cat: 'A06:2021-Vulnerable and Outdated Components', desc: 'Exposing legacy system nodes or unpatched client endpoints.' }
                ].map((item, idx) => {
                  const count = findings.filter(f => f.owasp.includes(item.cat.split(' ')[0])).length;
                  return (
                    <div key={idx} className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex justify-between items-start space-x-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white block font-display">{item.cat}</span>
                        <p className="text-[10px] text-[#8b949e] leading-relaxed">{item.desc}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {count > 0 ? (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono text-[10px] font-bold">
                            {count} Exposed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-500/10 text-[#8b949e] border border-[#30363d] rounded font-mono text-[10px]">
                            Cleared
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: CWE weakness taxonomy distribution */}
            <div className="bg-[#161B22] border border-[#30363d] rounded-xl p-6 shadow-md" id="cwe-taxonomy-card">
              <h3 className="text-sm font-bold text-white font-display border-b border-[#30363d] pb-2 mb-4 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>CWE Weakness Taxonomy Distribution</span>
              </h3>

              <div className="space-y-4" id="cwe-distribution-list">
                {[
                  { cwe: 'CWE-89: SQL Injection', severity: 'Critical' },
                  { cwe: 'CWE-79: Cross-Site Scripting', severity: 'Medium' },
                  { cwe: 'CWE-306: Missing Authentication', severity: 'High' },
                  { cwe: 'CWE-200: Sensitive Info Exposure', severity: 'Medium' }
                ].map((item, idx) => {
                  const matching = findings.filter(f => f.cwe.includes(item.cwe.split(':')[0]));
                  const percentage = findings.length > 0 ? Math.round((matching.length / findings.length) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-white font-bold">{item.cwe}</span>
                        <span className="text-[#8b949e]">{matching.length} Findings ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-[#0d1117] h-2 rounded overflow-hidden border border-[#30363d]">
                        <div 
                          className={`h-full rounded ${
                            item.severity === 'Critical' ? 'bg-red-500' :
                            item.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3.5 mt-5 font-sans text-[11px] text-[#8b949e] leading-relaxed">
                <strong>Taxonomy Validation:</strong> Mapping threat indicators to CWE weakness taxonomies enables operators to identify systematic developer patterns across isolated dev subnets.
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
